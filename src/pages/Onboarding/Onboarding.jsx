import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { saveProfile } from '../../hooks/useAuth'
import PhoneStep from './PhoneStep'
import OTPStep from './OTPStep'
import ProfileStep from './ProfileStep'
import LocationStep from './LocationStep'

const STEPS = ['phone', 'otp', 'profile', 'location']

export default function Onboarding() {
  const [step, setStep] = useState('phone')
  const [country] = useState('JO')
  const [email, setEmail] = useState('')
  const [profileData, setProfileData] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const { setProfile } = useAuthStore()
  const navigate = useNavigate()

  function handlePhoneNext(e) {
    setEmail(e)
    setStep('otp')
  }

  function handleOTPNext() {
    setStep('profile')
  }

  function handleProfileNext(data) {
    setProfileData(data)
    setStep('location')
  }

  async function handleLocationNext(locationData) {
    if (saving) return
    setSaving(true)
    setSaveError('')
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) throw error ?? new Error('جلسة منتهية، يرجى تسجيل الدخول مجددًا')
      const merged = { ...profileData, ...locationData }
      await saveProfile(user.id, merged)
      setProfile(merged)
      const pendingToken = sessionStorage.getItem('pending_invite_token')
      if (pendingToken) {
        sessionStorage.removeItem('pending_invite_token')
        navigate(`/join?token=${encodeURIComponent(pendingToken)}`)
      } else {
        navigate('/feed')
      }
    } catch (err) {
      setSaveError(err?.message ?? 'حدث خطأ، يرجى المحاولة مرة أخرى')
    } finally {
      setSaving(false)
    }
  }

  const progress = ((STEPS.indexOf(step) + 1) / STEPS.length) * 100

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col px-6 py-10 max-w-md mx-auto">
      <div className="w-full bg-brand-border rounded-full h-1 mb-8">
        <div
          className="bg-brand-primary h-1 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {saveError && (
        <p className="text-brand-error text-sm text-center mb-4">{saveError}</p>
      )}

      <div className="flex-1">
        {step === 'phone' && (
          <PhoneStep onNext={handlePhoneNext} />
        )}
        {step === 'otp' && (
          <OTPStep
            email={email}
            onNext={handleOTPNext}
            onBack={() => setStep('phone')}
          />
        )}
        {step === 'profile' && (
          <ProfileStep
            onNext={handleProfileNext}
            initialCountry={country}
          />
        )}
        {step === 'location' && (
          <LocationStep onNext={handleLocationNext} />
        )}
      </div>
    </div>
  )
}
