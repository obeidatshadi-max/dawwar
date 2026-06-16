import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'

export default function Step2Price({ type, onNext, onBack, initialData = {} }) {
  const { profile } = useAuthStore()
  const defaultCurrency = profile?.country === 'IQ' ? 'IQD' : 'JOD'

  const [originalPrice, setOriginalPrice] = useState(initialData.original_price ?? '')
  const [price, setPrice] = useState(initialData.price ?? '')
  const [currency, setCurrency] = useState(initialData.currency ?? defaultCurrency)
  const [phone, setPhone] = useState(initialData.phone ?? profile?.phone ?? '')
  const [urgencyNote, setUrgencyNote] = useState(initialData.urgency_note ?? '')
  const [error, setError] = useState('')

  const discount = (type === 'offer' && originalPrice && price && Number(originalPrice) > Number(price))
    ? Math.round((1 - Number(price) / Number(originalPrice)) * 100)
    : null

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
                onChange={(e) => setOriginalPrice(e.target.value)}
                className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:border-brand-primary"
              />
            </div>
            <div className="flex-1">
              <label className="text-brand-muted text-sm mb-1 block">سعر البيع</label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <div className="flex gap-3 items-center">
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
            {discount !== null && (
              <div className="text-center">
                <span className="text-brand-offer text-2xl font-bold">-{discount}%</span>
                <p className="text-brand-muted text-xs">خصم</p>
              </div>
            )}
          </div>
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
