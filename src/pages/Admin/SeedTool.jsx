import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useNetworks } from '../../hooks/useNetworks'

const SEED_TEMPLATES = [
  { type: 'offer', product_name: 'Augmentin 625mg — GSK', quantity: 150, unit: 'علبة', price: 12500, original_price: 16000, currency: 'IQD', expiry_date: '2026-08-15' },
  { type: 'offer', product_name: 'Paracetamol 500mg — Julphar', quantity: 500, unit: 'علبة', price: 2500, original_price: 3500, currency: 'IQD', expiry_date: '2026-12-01' },
  { type: 'offer', product_name: 'Omeprazole 20mg — AstraZeneca', quantity: 200, unit: 'علبة', price: 4500, original_price: 6000, currency: 'IQD', expiry_date: '2026-09-30' },
  { type: 'offer', product_name: 'Metformin 500mg — Merck', quantity: 300, unit: 'علبة', price: 3500, original_price: 4500, currency: 'IQD', expiry_date: '2026-11-30' },
  { type: 'offer', product_name: 'Amoxicillin 500mg — GlaxoSmithKline', quantity: 100, unit: 'علبة', price: 8000, original_price: 10000, currency: 'IQD', expiry_date: '2026-07-31' },
  { type: 'offer', product_name: 'Ibuprofen 400mg — Sanofi', quantity: 400, unit: 'علبة', price: 1800, original_price: 2500, currency: 'IQD', expiry_date: '2026-12-15' },
  { type: 'offer', product_name: 'Ceftriaxone 1g Vial — Fresenius', quantity: 60, unit: 'أمبول', price: 5500, original_price: 7000, currency: 'IQD', expiry_date: '2026-08-31' },
  { type: 'offer', product_name: 'Amlodipine 5mg — Pfizer', quantity: 200, unit: 'علبة', price: 3000, original_price: 4000, currency: 'IQD', expiry_date: '2027-01-01' },
  { type: 'wanted', product_name: 'Losartan 50mg', quantity: 50, unit: 'علبة', price: null, original_price: null, currency: 'IQD', expiry_date: null },
  { type: 'wanted', product_name: 'Atorvastatin 40mg', quantity: 80, unit: 'علبة', price: null, original_price: null, currency: 'IQD', expiry_date: null },
]

export default function SeedTool() {
  const navigate = useNavigate()
  const { session, profile } = useAuthStore()
  const { networks, loading: networksLoading } = useNetworks()

  const [selectedNetworkId, setSelectedNetworkId] = useState('')
  const [selected, setSelected] = useState(() => new Set(SEED_TEMPLATES.map((_, i) => i)))
  const [seeding, setSeeding] = useState(false)
  const [result, setResult] = useState(null)

  if (!session || session.user?.email !== 'shadi@psychologytobusiness.com') {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <p className="text-brand-error">غير مصرح</p>
      </div>
    )
  }

  function toggleItem(idx) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === SEED_TEMPLATES.length ? new Set() : new Set(SEED_TEMPLATES.map((_, i) => i))
    )
  }

  async function handleSeed() {
    if (!selectedNetworkId) { setResult({ error: 'اختر شبكة أولاً' }); return }
    if (selected.size === 0) { setResult({ error: 'اختر منشوراً واحداً على الأقل' }); return }

    setSeeding(true)
    setResult(null)

    const rows = [...selected].map((i) => ({
      ...SEED_TEMPLATES[i],
      network_id: selectedNetworkId,
      status: 'active',
      author_id: session.user.id,
      phone: profile?.phone ?? null,
      description: 'منشور تجريبي للمرحلة الأولى — للتواصل عبر المنسق',
    }))

    const { error } = await supabase.from('posts').insert(rows)
    setSeeding(false)

    if (error) {
      setResult({ error: error.message })
    } else {
      setResult({ success: `تم إدراج ${rows.length} منشور بنجاح` })
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg px-4 py-8 max-w-lg mx-auto" dir="rtl">
      <button onClick={() => navigate('/feed')} className="text-brand-muted text-sm mb-6 flex items-center gap-1">
        ← الرجوع
      </button>

      <h1 className="text-xl font-bold text-brand-text mb-1">أداة البذر التجريبي</h1>
      <p className="text-brand-muted text-sm mb-6">إدراج منشورات تجريبية لتفعيل الشبكة في المرحلة الأولى</p>

      {networksLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="mb-5">
            <label className="text-brand-text text-sm font-medium block mb-1">الشبكة المستهدفة</label>
            <select
              value={selectedNetworkId}
              onChange={(e) => setSelectedNetworkId(e.target.value)}
              className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text text-sm outline-none focus:border-brand-primary"
            >
              <option value="">— اختر شبكة —</option>
              {networks.map((n) => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <span className="text-brand-text text-sm font-medium">المنشورات ({selected.size} مختار)</span>
            <button onClick={toggleAll} className="text-brand-primary text-xs underline">
              {selected.size === SEED_TEMPLATES.length ? 'إلغاء الكل' : 'تحديد الكل'}
            </button>
          </div>

          <div className="flex flex-col gap-2 mb-6">
            {SEED_TEMPLATES.map((t, i) => (
              <label
                key={i}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  selected.has(i) ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-border bg-brand-card'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={() => toggleItem(i)}
                  className="accent-brand-primary w-4 h-4 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full text-white shrink-0 ${
                      t.type === 'offer' ? 'bg-brand-offer' : 'bg-brand-wanted'
                    }`}>
                      {t.type === 'offer' ? 'عرض' : 'مطلوب'}
                    </span>
                    <span className="text-brand-text text-sm truncate" dir="ltr">{t.product_name}</span>
                  </div>
                  <p className="text-brand-muted text-xs mt-0.5">
                    {t.quantity} {t.unit}
                    {t.price ? ` — ${t.price.toLocaleString()} ${t.currency}` : ''}
                    {t.expiry_date ? ` — ينتهي ${t.expiry_date}` : ''}
                  </p>
                </div>
              </label>
            ))}
          </div>

          {result?.error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {result.error}
            </div>
          )}
          {result?.success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
              <span>✅</span> {result.success}
              <button onClick={() => navigate('/feed')} className="mr-auto text-brand-primary text-xs underline">
                عرض الشبكة
              </button>
            </div>
          )}

          <button
            onClick={handleSeed}
            disabled={seeding || selected.size === 0 || !selectedNetworkId}
            className="w-full bg-brand-primary text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {seeding ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                جارٍ البذر...
              </>
            ) : (
              `بذر ${selected.size} منشور في الشبكة 🌱`
            )}
          </button>

          <p className="text-center text-brand-muted text-xs mt-4">
            هذه المنشورات ستظهر كمنشورات حقيقية. يمكنك حذفها لاحقاً من لوحة الإدارة.
          </p>
        </>
      )}
    </div>
  )
}
