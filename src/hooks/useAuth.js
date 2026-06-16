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

export async function sendOTP(phone, country = 'JO') {
  const { error } = await supabase.auth.signInWithOtp({
    phone: normalizePhone(phone, country),
  })
  if (error) throw error
}

export async function verifyOTP(phone, token, country = 'JO') {
  const { error } = await supabase.auth.verifyOtp({
    phone: normalizePhone(phone, country),
    token,
    type: 'sms',
  })
  if (error) throw error
}

export async function sendEmailOTP(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })
  if (error) throw error
}

export async function verifyEmailOTP(email, token) {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
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

// Exported for testing
export function normalizePhone(phone, country = 'JO') {
  const countryCode = country === 'IQ' ? '964' : '962'
  // Already E.164
  if (phone.startsWith('+')) return phone
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('00')) return '+' + digits.slice(2)
  if (digits.startsWith('0'))  return '+' + countryCode + digits.slice(1)
  return '+' + digits
}
