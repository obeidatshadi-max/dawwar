import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'

export default function Step2Price({ type, onNext, onBack, initialData = {} }) {
  const { profile } = useAuthStore()
  const defaultCurrency = profile?.country === 'IQ' ? 'IQD' : 'JOD'

  const [originalPrice, setOriginalPrice] = useState(initialData.original_price ?? '')
  const [price, setPrice] = useState(initialData.price ?? '')
  const [discountPct, setDiscountPct] = useState(
    (initialData.original_price && initialData.price && Number(initialData.original_price) > Number(initialData.price))
      ? String(Math.round((1 - Number(initialData.price) / Number(initialData.original_price)) * 100))
      : ''
  )
  const [currency, setCurrency] = useState(initialData.currency ?? defaultCurrency)
  const [phone, setPhone] = useState(initialData.phone ?? profile?.phone ?? '')
  const [urgencyNote, setUrgencyNote] = useState(initialData.urgency_note ?? '')
  const [error, setError] = useState('')

  const round = (x) => Math.round(x * 1000) / 1000

  // Two-way binding: editing any of original / discount / sale keeps the trio consistent.
  function handleOriginal(v) {
    setOriginalPrice(v)
    if (discountPct !== '' && v) setPrice(String(round(Number(v) * (1 - Number(discountPct) / 100))))
  }
  function handleDiscount(v) {
    const n = v === '' ? '' : String(Math.max(0, Math.min(99, Math.round(Number(v)))))
    setDiscountPct(n)
    if (n !== '' && originalPrice) setPrice(String(round(Number(originalPrice) * (1 - Number(n) / 100))))
  }
  function handlePrice(v) {
    setPrice(v)
    if (originalPrice && Number(originalPrice) > 0 && v) {
      setDiscountPct(String(Math.round((1 - Number(v) / Number(originalPrice)) * 100)))
    }
  }

  function handleNext() {
    if (!phone.trim()) { setError('رقم الواتساب مطلوب'); return }
    if (type === 'offer' && (!price || Number(price) <= 0)) { setError('السعر مطلوب'); return }
    onNext({
      price: price ? Number(price) : null,
      original_price: originalPrice ? Number(originalPrice) : null,
      currency,
      phone: phone.trim(),
      urgency_note: urgencyNote.trim() || null,
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-brand-text text-xl font-bold">
        {type === 'offer' ? 'السعر' : 'معلومات التواصل'}
      </h2>

      {type === 'offer' && (
        <>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-brand-muted text-sm mb-1 block">السعر الأصلي</label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={originalPrice}
                onChange={(e) => handleOriginal(e.target.value)}
                className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:border-brand-primary"
              />
            </div>
            <div className="w-24">
              <label className="text-brand-muted text-sm mb-1 block">الخصم %</label>
              <input
                type="number"
                min="0"
                max="99"
                inputMode="numeric"
                value={discountPct}
                onChange={(e) => handleDiscount(e.target.value)}
                placeholder="٪"
                className="w-full bg-brand-card border border-brand-border rounded-xl px-3 py-3 text-brand-text outline-none focus:border-brand-primary text-center"
              />
            </div>
          </div>

          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-brand-muted text-sm mb-1 block">سعر البيع</label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={price}
                onChange={(e) => handlePrice(e.target.value)}
                className="w-full bg-brand-card border border-brand-primary/60 rounded-xl px-4 py-3 text-brand-text font-semibold outline-none focus:border-brand-primary"
              />
            </div>
            <div className="flex-1">
              <label className="text-brand-muted text-sm mb-1 block">العملة</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:border-brand-primary"
              >
                <option value="JOD">دينار أردني (JOD)</option>
                <option value="IQD">دينار عراقي (IQD)</option>
              </select>
            </div>
          </div>

          {discountPct !== '' && Number(discountPct) > 0 && (
            <p className="text-brand-offer text-sm font-bold text-center">
              خصم {discountPct}% — يظهر للمشتري على البطاقة
            </p>
          )}
        </>
      )}

      {type === 'wanted' && (
        <div>
          <label className="text-brand-muted text-sm mb-1 block">ملاحظة الإلحاحية (اختياري)</label>
          <input
            type="text"
            value={urgencyNote}
            onChange={(e) => setUrgencyNote(e.target.value)}
            placeholder="مثال: عاجل — محتاج هذا الأسبوع"
            className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text placeholder:text-brand-muted outline-none focus:border-brand-primary"
          />
        </div>
      )}

      <div>
        <label className="text-brand-muted text-sm mb-1 block">رقم الواتساب</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          dir="ltr"
          className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text placeholder:text-brand-muted outline-none focus:border-brand-primary"
        />
      </div>

      {error && <p className="text-brand-error text-sm">{error}</p>}

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-3 border border-brand-border text-brand-muted rounded-xl">
          رجوع
        </button>
        <button onClick={handleNext} className="flex-1 py-3 bg-brand-primary text-white rounded-xl font-semibold">
          التالي
        </button>
      </div>
    </div>
  )
}
