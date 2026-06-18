import { supabase } from './supabase'

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY

export function pushSupported() {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window
  )
}

// VAPID public key (base64url) → Uint8Array for applicationServerKey.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

// Subscribe this device to push and persist the subscription for the user.
// Returns true on success. Safe to call repeatedly (upsert by endpoint).
export async function subscribeToPush(userId) {
  if (!pushSupported() || !VAPID_PUBLIC || !userId) return false
  try {
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      })
    }
    const json = sub.toJSON()
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        profile_id: userId,
        endpoint: sub.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
      { onConflict: 'endpoint' }
    )
    if (error) { console.error('[push] save failed', error); return false }
    return true
  } catch (err) {
    console.error('[push] subscribe failed', err)
    return false
  }
}
