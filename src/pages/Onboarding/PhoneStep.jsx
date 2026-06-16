import { useState } from 'react'
import { sendEmailOTP } from '../../hooks/useAuth'

export default function PhoneStep({ onNext }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) return
    setLoading(true)
    setError('')
    try {
      await sendEmailOTP(email.trim())
      onNext(email.trim())
    } catch (err) {
      setError('تعذر إرسال الرمز. تحقق من البريد الإلكتروني.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">أهلاً بك في دوّار 🌿</h1>
        <p className="text-brand-muted mt-1 text-sm">أدخل بريدك الإلكتروني للبدء</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text text-lg focus:outline-none focus:border-brand-primary"
          dir="ltr"
          autoComplete="email"
        />

        {error && <p className="text-brand-error text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !email.includes('@')}
          className="w-full bg-brand-primary text-white font-bold py-3 rounded-xl disabled:opacity-50"
        >
          {loading ? 'جارٍ الإرسال...' : 'التالي'}
        </button>
      </form>
    </div>
  )
}
