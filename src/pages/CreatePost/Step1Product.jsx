import { useState } from 'react'

const UNITS = ['علبة', 'شريط', 'أمبول', 'كيس', 'قطعة', 'أخرى']

export default function Step1Product({ onNext, initialData = {} }) {
  const [type, setType] = useState(initialData.type ?? 'offer')
  const [productName, setProductName] = useState(initialData.product_name ?? '')
  const [quantity, setQuantity] = useState(initialData.quantity ?? '')
  const [unit, setUnit] = useState(initialData.unit ?? 'علبة')
  const [expiryDate, setExpiryDate] = useState(initialData.expiry_date ?? '')
  const [error, setError] = useState('')

  function validate() {
    if (!productName.trim()) return 'اسم المنتج مطلوب'
    if (!quantity || Number(quantity) <= 0) return 'الكمية مطلوبة'
    if (type === 'offer' && !expiryDate) return 'تاريخ الانتهاء مطلوب للعروض'
    return ''
  }

  function handleNext() {
    const err = validate()
    if (err) { setError(err); return }
    onNext({ type, product_name: productName.trim(), quantity: Number(quantity), unit, expiry_date: expiryDate || null })
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-brand-text text-xl font-bold">المنتج</h2>

      <div className="flex gap-2 bg-brand-card rounded-xl p-1">
        {[['offer', 'عرض'], ['wanted', 'مطلوب']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setType(val)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              type === val ? 'bg-brand-primary text-white' : 'text-brand-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        <label className="text-brand-muted text-sm mb-1 block">اسم المنتج (بالإنجليزية)</label>
        <input
          type="text"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder="مثال: Augmentin 625mg"
          dir="ltr"
          className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text placeholder:text-brand-muted outline-none focus:border-brand-primary"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-brand-muted text-sm mb-1 block">الكمية</label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:border-brand-primary"
          />
        </div>
        <div className="flex-1">
          <label className="text-brand-muted text-sm mb-1 block">الوحدة</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:border-brand-primary appearance-none"
          >
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {type === 'offer' && (
        <div>
          <label htmlFor="expiry-date" className="text-brand-muted text-sm mb-1 block">تاريخ انتهاء الصلاحية</label>
          <input
            id="expiry-date"
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:border-brand-primary"
          />
        </div>
      )}

      {error && <p className="text-brand-error text-sm">{error}</p>}

      <button
        onClick={handleNext}
        className="w-full py-3 bg-brand-primary text-white rounded-xl font-semibold"
      >
        التالي
      </button>
    </div>
  )
}
