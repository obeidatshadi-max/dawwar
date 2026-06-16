import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export function useAuthInit() {
  const { setSession, setProfile, setLoading, clear } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session) {
        const profile = await fetchProfile(session.user.id)
        setProfile(profile)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        if (session) {
          const profile = await fetchProfile(session.user.id)
          setProfile(profile)
        } else {
          clear()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])
}

async function fetchProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

export async function sendOTP(phone) {
  const { error } = await supabase.auth.signInWithOtp({
    phone: normalizePhone(phone),
  })
  if (error) throw error
}

export async function verifyOTP(phone, token) {
  const { error } = await supabase.auth.verifyOtp({
    phone: normalizePhone(phone),
    token,
    type: 'sms',
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
export function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('00')) return '+' + digits.slice(2)
  if (digits.startsWith('0'))  return '+962' + digits.slice(1)
  if (!digits.startsWith('+')) return '+' + digits
  return phone
}
