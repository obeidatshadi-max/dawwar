import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'

export default function CreateNetwork() {
  const navigate = useNavigate()
  const { session, profile } = useAuthStore()
  const [name, setName] = useState('')
  const [city, setCity] = useState(profile?.city ?? '')
  const [country, setCountry] = useState(profile?.country ?? 'JO')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim()) { setError('اسم الشبكة مطلوب'); return }
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const { data: network, error: netErr } = await supabase
        .from('networks')
        .insert({
          name: name.trim(),
          city: city.trim() || null,
          country,
          description: description.trim() || null,
          created_by: session.user.id,
        })
        .select('id')
        .single()
      if (netErr) throw netErr

      const { error: memberErr } = await supabase
        .from('network_members')
        .insert({
          network_id: network.id,
          profile_id: session.user.id,
          role: 'admin',
          status: 'active',
        })
      if (memberErr) throw memberErr

      navigate(`/networks/${network.id}/admin`, { replace: true })
    } catch (err) {
      setError(err?.message ?? 'خطأ في إنشاء الشبكة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg px-6 py-10 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="text-brand-muted" aria-label="رجوع">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <h1 className="text-brand-text text-xl font-bold">إنشاء شبكة جديدة</h1>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <label className="text-brand-muted text-sm mb-1 block">اسم الشبكة</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: صيدليات شمال عمّان"
            className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text placeholder:text-brand-muted outline-none focus:border-brand-primary"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-brand-muted text-sm mb-1 block">المدينة</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:border-brand-primary"
            />
          </div>
          <div className="flex-1">
            <label className="text-brand-muted text-sm mb-1 block">الدولة</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:border-brand-primary"
            >
              <option value="JO">الأردن</option>
              <option value="IQ">العراق</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-brand-muted text-sm mb-1 block">وصف (اختياري)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="وصف قصير للشبكة..."
            className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text placeholder:text-brand-muted outline-none focus:border-brand-primary resize-none"
          />
        </div>

        {error && <p className="text-brand-error text-sm">{error}</p>}

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full py-3 bg-brand-primary text-white rounded-xl font-semibold disabled:opacity-50"
        >
          {loading ? 'جارٍ الإنشاء...' : 'إنشاء الشبكة'}
        </button>
      </div>
    </div>
  )
}
