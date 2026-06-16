import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export default function JoinNetwork() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { session, loading } = useAuthStore()
  const [status, setStatus] = useState('loading') // 'loading' | 'joining' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  const token = searchParams.get('token')

  useEffect(() => {
    if (loading) return  // wait for auth init
    if (!token) {
      setStatus('error')
      setErrorMsg('رابط الدعوة غير صالح')
      return
    }
    if (!session) {
      sessionStorage.setItem('pending_invite_token', token)
      navigate('/onboarding', { replace: true })
      return
    }
    joinNetwork()
  }, [loading, session, token])

  async function joinNetwork() {
    setStatus('joining')
    try {
      // 1. Fetch invite
      const { data: invite, error: fetchErr } = await supabase
        .from('network_invites')
        .select('id, network_id, expires_at, max_uses, uses_count')
        .eq('token', token)
        .single()

      if (fetchErr || !invite) throw new Error('الدعوة غير موجودة')
      if (new Date(invite.expires_at) < new Date()) throw new Error('انتهت صلاحية الدعوة')
      if (invite.uses_count >= invite.max_uses) throw new Error('تم الوصول إلى الحد الأقصى لعدد الأعضاء')

      // 2. Insert member (upsert to handle already-member gracefully)
      const { error: insertErr } = await supabase
        .from('network_members')
        .upsert(
          { network_id: invite.network_id, profile_id: session.user.id, role: 'member', status: 'active' },
          { onConflict: 'network_id,profile_id', ignoreDuplicates: true }
        )
      if (insertErr) throw insertErr

      // 3. Increment uses_count (best-effort — don't fail join if this fails)
      await supabase
        .from('network_invites')
        .update({ uses_count: invite.uses_count + 1 })
        .eq('id', invite.id)

      setStatus('success')
      setTimeout(() => navigate('/feed', { replace: true }), 1500)
    } catch (err) {
      setStatus('error')
      setErrorMsg(err?.message ?? 'حدث خطأ أثناء الانضمام')
    }
  }

  // UI
  if (status === 'loading') return <FullscreenMessage text="جارٍ التحقق..." />
  if (status === 'joining') return <FullscreenMessage text="جارٍ الانضمام إلى الشبكة..." />
  if (status === 'success') return <FullscreenMessage text="تم الانضمام! جارٍ التوجيه..." success />
  if (status === 'error') return (
    <FullscreenMessage text={errorMsg} error>
      <button
        onClick={() => navigate('/', { replace: true })}
        className="mt-6 px-6 py-2 bg-brand-primary text-white rounded-xl text-sm"
      >
        الصفحة الرئيسية
      </button>
    </FullscreenMessage>
  )
}

function FullscreenMessage({ text, success, error, children }) {
  const color = success ? 'text-brand-success' : error ? 'text-brand-error' : 'text-brand-muted'
  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-6 text-center">
      <p className={`text-lg font-semibold ${color}`}>{text}</p>
      {children}
    </div>
  )
}
