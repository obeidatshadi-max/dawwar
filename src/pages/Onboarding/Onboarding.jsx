import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { saveProfile } from '../../hooks/useAuth'
import { compressImage, uploadMedia } from '../../lib/mediaUtils'
import PhoneStep from './PhoneStep'
import ProfileStep from './ProfileStep'
import LocationStep from './LocationStep'

const STEPS = ['email', 'profile', 'location']

export default function Onboarding() {
  const [step, setStep] = useState('email')
  const [country] = useState('JO')
  const [profileData, setProfileData] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const { session, profile, setProfile } = useAuthStore()
  const navigate = useNavigate()

  // Magic link lands here: session arrives but no profile yet → skip to profile step
  useEffect(() => {
    if (session && !profile && step === 'email') {
      setStep('profile')
    }
  }, [session, profile, step])

  function handleProfileNext(data) {
    setProfileData(data)
    setStep('location')
  }

  async function handleBack() {
    if (step === 'location') {
      setStep('profile')
    } else if (step === 'profile') {
      // First step after sign-in → backing out means restart with a different number
      await supabase.auth.signOut()
      setProfile(null)
      setStep('email')
    }
  }

  async function handleLocationNext(locationData) {
    if (saving) return
    setSaving(true)
    setSaveError('')
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) throw error ?? new Error('جلسة منتهية، يرجى تسجيل الدخول مجددًا')
      const { photo_file, ...rest } = profileData ?? {}
      const merged = { ...rest, ...locationData }
      if (photo_file) {
        const blob = await compressImage(photo_file)
        merged.photo_url = await uploadMedia(
          supabase, 'post-media', `pharmacy/${user.id}.jpg`, blob, 'image/jpeg'
        )
      }
      await saveProfile(user.id, merged)
      setProfile(merged)
      // Demo-network enrollment is handled by a DB trigger on profiles insert.

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
      <div className="flex items-center gap-3 mb-8">
        {step !== 'email' && (
          <button
            onClick={handleBack}
            className="text-brand-muted flex-shrink-0"
            aria-label="رجوع"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
        <div className="flex-1 bg-brand-border rounded-full h-1">
          <div
            className="bg-brand-primary h-1 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {saveError && (
        <p className="text-brand-error text-sm text-center mb-4">{saveError}</p>
      )}

      <div className="flex-1">
        {step === 'email' && (
          <PhoneStep onNext={() => {}} />
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
