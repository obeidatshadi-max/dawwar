import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'

const EXPIRY_OPTIONS = [
  { label: '٧ أيام', days: 7 },
  { label: '١٤ يوماً', days: 14 },
  { label: '٣٠ يوماً', days: 30 },
]

export default function AdminPanel() {
  const { networkId } = useParams()
  const navigate = useNavigate()
  const { session } = useAuthStore()

  const [network, setNetwork] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteLink, setInviteLink] = useState('')
  const [inviteDays, setInviteDays] = useState(7)
  const [inviteMax, setInviteMax] = useState(50)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!networkId || !session) return
    let cancelled = false
    async function load() {
      const [{ data: net }, { data: mems }] = await Promise.all([
        supabase.from('networks').select('id, name, city, country').eq('id', networkId).single(),
        supabase
          .from('network_members')
          .select('id, role, joined_at, profile:profiles(id, pharmacy_name, city)')
          .eq('network_id', networkId)
          .eq('status', 'active'),
      ])
      if (!cancelled) {
        setNetwork(net)
        setMembers(mems ?? [])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [networkId, session])

  async function generateInvite() {
    if (generating) return
    setGenerating(true)
    setError('')
    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + inviteDays)

      const { data: invite, error: invErr } = await supabase
        .from('network_invites')
        .insert({
          network_id: networkId,
          created_by: session.user.id,
          expires_at: expiresAt.toISOString(),
          max_uses: Number(inviteMax),
          uses_count: 0,
        })
        .select('token')
        .single()
      if (invErr) throw invErr

      const link = `${window.location.origin}/join?token=${invite.token}`
      setInviteLink(link)
    } catch (err) {
      setError(err?.message ?? 'خطأ في توليد الرابط')
    } finally {
      setGenerating(false)
    }
  }

  async function removeMember(memberId) {
    const { error: delErr } = await supabase
      .from('network_members')
      .delete()
      .eq('id', memberId)
    if (delErr) setError(delErr?.message ?? 'خطأ في إزالة العضو')
    else setMembers((prev) => prev.filter((m) => m.id !== memberId))
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const waShare = inviteLink
    ? `https://wa.me/?text=${encodeURIComponent(`انضم إلى شبكة ${network?.name ?? ''} على تطبيق دوّار:\n${inviteLink}`)}`
    : null

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4 border-b border-brand-border">
        <button onClick={() => navigate('/networks')} className="text-brand-muted" aria-label="رجوع">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <h1 className="text-brand-text text-xl font-bold">{network?.name}</h1>
      </div>

      <div className="px-4 py-6 flex flex-col gap-6">
        {/* Invite generator */}
        <section>
          <h2 className="text-brand-text font-semibold mb-3">توليد رابط دعوة</h2>
          <div className="bg-brand-card border border-brand-border rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-brand-muted text-xs mb-1 block">مدة الصلاحية</label>
                <select
                  value={inviteDays}
                  onChange={(e) => setInviteDays(Number(e.target.value))}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-brand-text text-sm outline-none"
                >
                  {EXPIRY_OPTIONS.map((o) => (
                    <option key={o.days} value={o.days}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-brand-muted text-xs mb-1 block">أقصى استخدامات</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={inviteMax}
                  onChange={(e) => setInviteMax(Number(e.target.value))}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-brand-text text-sm outline-none"
                />
              </div>
            </div>

            <button
              onClick={generateInvite}
              disabled={generating}
              className="w-full py-2.5 bg-brand-primary text-white rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {generating ? 'جارٍ التوليد...' : 'توليد رابط الدعوة'}
            </button>

            {inviteLink && (
              <div className="flex flex-col gap-2">
                <p className="text-brand-muted text-xs break-all">{inviteLink}</p>
                <div className="flex gap-2">
                  <button
                    onClick={copyLink}
                    className="flex-1 py-2 rounded-xl border border-brand-border text-brand-muted text-sm"
                  >
                    {copied ? '✓ تم النسخ' : 'نسخ الرابط'}
                  </button>
                  <a
                    href={waShare}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 rounded-xl bg-brand-whatsapp text-white text-sm text-center"
                  >
                    مشاركة واتساب
                  </a>
                </div>
              </div>
            )}

            {error && <p className="text-brand-error text-xs">{error}</p>}
          </div>
        </section>

        {/* Members list */}
        <section>
          <h2 className="text-brand-text font-semibold mb-3">الأعضاء ({members.length})</h2>
          <div className="flex flex-col gap-2">
            {members.map((m) => (
              <div key={m.id} className="bg-brand-card border border-brand-border rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-brand-text text-sm font-medium">{m.profile?.pharmacy_name}</p>
                  <p className="text-brand-muted text-xs">{m.profile?.city} · {m.role === 'admin' ? 'مدير' : 'عضو'}</p>
                </div>
                {m.profile?.id !== session?.user?.id && m.role !== 'admin' && (
                  <button
                    onClick={() => removeMember(m.id)}
                    className="text-brand-error text-xs px-3 py-1 rounded-lg border border-brand-error"
                  >
                    إزالة
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
