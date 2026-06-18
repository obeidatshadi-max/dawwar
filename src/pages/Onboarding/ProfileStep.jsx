import { useState, useRef, useMemo, useEffect } from 'react'

export default function ProfileStep({ onNext, initialCountry = 'JO' }) {
  const [form, setForm] = useState({
    pharmacy_name: '',
    owner_name: '',
    phone: '',
    city: '',
    country: initialCountry,
  })
  const [submitting, setSubmitting] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const photoInputRef = useRef(null)
  const photoPreview = useMemo(() => (photoFile ? URL.createObjectURL(photoFile) : null), [photoFile])
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }, [photoPreview])

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  function isValid() {
    return (
      form.pharmacy_name.trim() &&
      form.owner_name.trim() &&
      form.phone.trim() &&
      form.city.trim()
    )
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (submitting || !isValid()) return
    setSubmitting(true)
    const payload = {
      ...form,
      pharmacy_name: form.pharmacy_name.trim(),
      owner_name: form.owner_name.trim(),
      phone: form.phone.trim(),
      city: form.city.trim(),
    }
    if (photoFile) payload.photo_file = photoFile
    onNext(payload)
  }

  const inputClass = 'w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text focus:outline-none focus:border-brand-primary'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">بيانات الصيدلية</h1>
        <p className="text-brand-muted mt-1 text-sm">تظهر هذه المعلومات لأعضاء شبكتك</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          className="self-center w-20 h-20 rounded-full border-2 border-dashed border-brand-border flex items-center justify-center overflow-hidden"
        >
          {photoPreview
            ? <img src={photoPreview} alt="" className="w-full h-full object-cover" />
            : <span className="text-brand-muted text-xs text-center">صورة<br/>الصيدلية</span>}
        </button>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
          className="hidden"
          aria-label="صورة الصيدلية"
        />
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
          disabled={submitting || !isValid()}
          className="w-full bg-brand-primary text-white font-bold py-3 rounded-xl mt-2 disabled:opacity-50"
        >
          التالي
        </button>
      </form>
    </div>
  )
}
