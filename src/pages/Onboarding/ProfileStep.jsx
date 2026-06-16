import { useState } from 'react'

export default function ProfileStep({ onNext }) {
  const [form, setForm] = useState({
    pharmacy_name: '',
    owner_name: '',
    phone: '',
    city: '',
    country: 'JO',
  })

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  function isValid() {
    return form.pharmacy_name && form.owner_name && form.phone && form.city
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!isValid()) return
    onNext(form)
  }

  const inputClass = 'w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text focus:outline-none focus:border-brand-primary'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">بيانات الصيدلية</h1>
        <p className="text-brand-muted mt-1 text-sm">تظهر هذه المعلومات لأعضاء شبكتك</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input className={inputClass} placeholder="اسم الصيدلية" value={form.pharmacy_name} onChange={update('pharmacy_name')} />
        <input className={inputClass} placeholder="اسم المالك" value={form.owner_name} onChange={update('owner_name')} />
        <input className={inputClass} placeholder="رقم الواتساب" type="tel" dir="ltr" value={form.phone} onChange={update('phone')} />

        <select
          aria-label="البلد"
          className={inputClass}
          value={form.country}
          onChange={update('country')}
        >
          <option value="JO">الأردن 🇯🇴</option>
          <option value="IQ">العراق 🇮🇶</option>
        </select>

        <input className={inputClass} placeholder="المدينة" value={form.city} onChange={update('city')} />

        <button
          type="submit"
          disabled={!isValid()}
          className="w-full bg-brand-primary text-white font-bold py-3 rounded-xl mt-2 disabled:opacity-50"
        >
          التالي
        </button>
      </form>
    </div>
  )
}
