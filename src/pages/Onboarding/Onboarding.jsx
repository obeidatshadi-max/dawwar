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
  const [country, setCountry] = useState('JO')
  const [phone, setPhone] = useState('')
  const [profileData, setProfileData] = useState(null)
  const { setProfile } = useAuthStore()
  const navigate = useNavigate()

  function handlePhoneNext(p) {
    setPhone(p)
    setStep('otp')
  }

  function handleCountryChange(c) {
    setCountry(c)
  }

  function handleOTPNext() {
    setStep('profile')
  }

  async function handleProfileNext(data) {
    setProfileData(data)
    setStep('location')
  }

  async function handleLocationNext(locationData) {
    const { data: { user } } = await supabase.auth.getUser()
    const merged = { ...profileData, ...locationData }
    await saveProfile(user.id, merged)
    setProfile(merged)

    const pendingToken = sessionStorage.getItem('pending_invite_token')
    if (pendingToken) {
      sessionStorage.removeItem('pending_invite_token')
      navigate(`/join?token=${pendingToken}`)
    } else {
      navigate('/feed')
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

      <div className="flex-1">
        {step === 'phone' && (
          <PhoneStep
            onNext={handlePhoneNext}
            country={country}
          />
        )}
        {step === 'otp' && (
          <OTPStep
            phone={phone}
            country={country}
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
