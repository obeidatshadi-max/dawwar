import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export function useAuthInit() {
  const { setSession, setProfile, setLoading, clear } = useAuthStore()

  useEffect(() => {
    let initialised = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        if (session) {
          const profile = await fetchProfile(session.user.id)
          setProfile(profile)
        } else {
          clear()
        }
        if (!initialised) {
          initialised = true
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])
}

async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error && error.code !== 'PGRST116') console.error('[fetchProfile]', error)
  return data
}

// One-tap trial sign-in: no email/password. Creates a real session (real
// auth.uid so RLS works); just can't be recovered on another device.
export async function signInAnonymous() {
  const { error } = await supabase.auth.signInAnonymously()
  if (error) throw error
}

// --- Phone + PIN login (recoverable across devices, no SMS) ---
// The phone number is the account identity; we map it to a synthetic email so
// Supabase email/password auth handles it. Same phone+PIN → same account.
export function phoneToDigits(phone, country = 'IQ') {
  const cc = country === 'JO' ? '962' : '964'
  let d = (phone || '').replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  else if (d.startsWith('0')) d = cc + d.slice(1)
  else if (!d.startsWith(cc)) d = cc + d
  return d
}

function phoneToEmail(phone, country) {
  return `${phoneToDigits(phone, country)}@dawwar.app`
}

export async function loginWithPhonePin(phone, pin, country = 'IQ') {
  const { error } = await supabase.auth.signInWithPassword({
    email: phoneToEmail(phone, country),
    password: pin,
  })
  if (error) throw error
}

export async function signupWithPhonePin(phone, pin, country = 'IQ') {
  const { error } = await supabase.auth.signUp({
    email: phoneToEmail(phone, country),
    password: pin,
  })
  if (error) throw error
}

export async function sendMagicLink(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${window.location.origin}/onboarding`,
    },
  })
  if (error) throw error
}

// Verify the 6-digit code from the email. Works inside the installed PWA,
// so the session persists there (unlike clicking the link, which opens Safari).
export async function verifyEmailOTP(email, token) {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: token.trim(),
    type: 'email',
  })
  if (error) throw error
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function saveProfile(userId, data) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...data })
  if (error) throw error
}
