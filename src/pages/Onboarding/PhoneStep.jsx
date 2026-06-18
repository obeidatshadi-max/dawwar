import { useState } from 'react'
import { loginWithPhonePin, signupWithPhonePin, signInAnonymous } from '../../hooks/useAuth'

export default function PhoneStep() {
  const [country, setCountry] = useState('IQ')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const phoneOk = phone.replace(/\D/g, '').length >= 9
  const pinOk = pin.length === 6

  async function handleSubmit(e) {
    e.preventDefault()
    if (!phoneOk || !pinOk) return
    setLoading(true)
    setError('')

    // Try the selected country first, then the other — so the same number
    // never forks into two accounts because of a different country choice.
    const order = country === 'IQ' ? ['IQ', 'JO'] : ['JO', 'IQ']
    for (const c of order) {
      try {
        await loginWithPhonePin(phone, pin, c)
        return // success → session set, Onboarding takes over
      } catch { /* try next */ }
    }

    // No existing account matched → create one under the chosen country
    try {
      await signupWithPhonePin(phone, pin, country)
      await loginWithPhonePin(phone, pin, country)
    } catch (signupErr) {
      const msg = signupErr?.message ?? ''
      if (/already|registered|exists/i.test(msg)) {
        setError('الرمز السري غير صحيح لهذا الرقم.')
      } else {
        setError('تعذر الدخول. حاول مرة أخرى.')
      }
      setLoading(false)
    }
  }

  async function handleQuickStart() {
    setLoading(true)
    setError('')
    try {
      await signInAnonymous()
    } catch {
      setError('تعذر البدء. أعد المحاولة.')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <div className="text-5xl mb-2">🌿</div>
        <h1 className="text-2xl font-bold text-brand-text">أهلاً بك في دوّار</h1>
        <p className="text-brand-muted mt-1 text-sm">سجّل برقم موبايلك ورمز سري — وادخل من أي جهاز</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-brand-muted text-sm mb-1 block">رقم الموبايل</label>
          <div className="flex gap-2">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="bg-brand-card border border-brand-border rounded-xl px-2 text-brand-text text-sm outline-none focus:border-brand-primary"
              aria-label="رمز الدولة"
            >
              <option value="IQ">🇮🇶 +964</option>
              <option value="JO">🇯🇴 +962</option>
            </select>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07XX XXX XXXX"
              className="flex-1 bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text text-lg outline-none focus:border-brand-primary"
              dir="ltr"
              autoComplete="tel"
            />
          </div>
        </div>

        <div>
          <label className="text-brand-muted text-sm mb-1 block">الرمز السري (٦ أرقام)</label>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="● ● ● ● ● ●"
            className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text text-xl text-center tracking-[0.3em] outline-none focus:border-brand-primary"
            dir="ltr"
            autoComplete="current-password"
          />
          <p className="text-brand-muted text-xs mt-1">اختر رمزاً تتذكّره — ستحتاجه للدخول لاحقاً.</p>
        </div>

        {error && <p className="text-brand-error text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading || !phoneOk || !pinOk}
          className="w-full bg-brand-primary text-white font-bold py-3.5 rounded-xl disabled:opacity-50 text-lg"
        >
          {loading ? 'جارٍ الدخول...' : 'دخول / تسجيل'}
        </button>
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={handleQuickStart}
          disabled={loading}
          className="text-brand-muted text-sm underline"
        >
          أو تجربة سريعة بدون رقم
        </button>
      </div>
    </div>
  )
}
