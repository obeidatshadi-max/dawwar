import { useState } from 'react'
import { sendOTP } from '../../hooks/useAuth'

export default function PhoneStep({ onNext, country = 'JO' }) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const digits = phone.replace(/\D/g, '')
    if (!phone.trim() || digits.length < 9) return
    setLoading(true)
    setError('')
    try {
      await sendOTP(phone.trim(), country)
      onNext(phone.trim())
    } catch (err) {
      setError('تعذر إرسال الرمز. تأكد من الرقم.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">أهلاً بك في دوّار 🌿</h1>
        <p className="text-brand-muted mt-1 text-sm">أدخل رقم هاتفك للبدء</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={country === 'IQ' ? '07901234567' : '0791234567'}
          className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text text-lg tracking-widest focus:outline-none focus:border-brand-primary"
          dir="ltr"
        />

        {error && <p className="text-brand-error text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || phone.replace(/\D/g, '').length < 9}
          className="w-full bg-brand-primary text-white font-bold py-3 rounded-xl disabled:opacity-50"
        >
          {loading ? 'جارٍ الإرسال...' : 'التالي'}
        </button>
      </form>
    </div>
  )
}
