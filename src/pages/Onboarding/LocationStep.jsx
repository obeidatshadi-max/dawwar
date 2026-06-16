import { useState } from 'react'

export default function LocationStep({ onNext }) {
  const [status, setStatus] = useState('idle') // idle | loading | success | error

  async function captureLocation() {
    setStatus('loading')
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      )
      const { latitude: lat, longitude: lng } = pos.coords
      const label = await reverseGeocode(lat, lng)
      setStatus('success')
      onNext({ lat, lng, location_label: label })
    } catch {
      setStatus('error')
    }
  }

  function skip() {
    if (status === 'loading') return
    onNext({ lat: null, lng: null, location_label: null })
  }

  return (
    <div className="flex flex-col gap-6 items-center text-center">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">موقع الصيدلية</h1>
        <p className="text-brand-muted mt-1 text-sm">
          يُستخدم لعرض المسافة بين الصيدليات في الشبكة
        </p>
      </div>

      <div className="text-6xl">📍</div>

      {status === 'error' && (
        <p className="text-brand-error text-sm">تعذر تحديد الموقع. تحقق من الصلاحيات.</p>
      )}
      {status === 'success' && (
        <p className="text-brand-success text-sm">✓ تم تحديد الموقع بنجاح</p>
      )}

      <button
        onClick={captureLocation}
        disabled={status === 'loading' || status === 'success'}
        className="w-full bg-brand-primary text-white font-bold py-3 rounded-xl disabled:opacity-50"
      >
        {status === 'loading' ? 'جارٍ التحديد...' : 'تحديد الموقع'}
      </button>

      <button
        onClick={skip}
        disabled={status === 'loading'}
        className="text-brand-muted text-sm underline disabled:opacity-40"
      >
        تخطي الآن
      </button>
    </div>
  )
}

async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ar`
  const res = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: { 'User-Agent': 'dawwar-app/1.0' },
  })
  if (!res.ok) throw new Error(`Nominatim ${res.status}`)
  const data = await res.json()
  const city = data.address?.city || data.address?.town || data.address?.village || ''
  const suburb = data.address?.suburb || ''
  const label = [city, suburb].filter(Boolean).join(' - ')
  if (!label) throw new Error('empty address')
  return label
}
