import { useState } from 'react'
import { verifyOTP } from '../../hooks/useAuth'

export default function OTPStep({ phone, country = 'JO', onNext, onBack }) {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (token.length !== 6) return
    setLoading(true)
    setError('')
    try {
      await verifyOTP(phone, token, country)
      onNext()
    } catch (err) {
      setError('الرمز غير صحيح أو انتهت صلاحيته.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">رمز التحقق</h1>
        <p className="text-brand-muted mt-1 text-sm">
          أُرسل رمز SMS إلى {phone}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={token}
          onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-4 text-brand-text text-3xl tracking-[1rem] text-center focus:outline-none focus:border-brand-primary"
          dir="ltr"
        />

        {error && <p className="text-brand-error text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading || token.length !== 6}
          className="w-full bg-brand-primary text-white font-bold py-3 rounded-xl disabled:opacity-50"
        >
          {loading ? 'جارٍ التحقق...' : 'تأكيد'}
        </button>

        <button type="button" onClick={onBack} disabled={loading} className="text-brand-muted text-sm text-center disabled:opacity-40">
          تغيير الرقم
        </button>
      </form>
    </div>
  )
}
