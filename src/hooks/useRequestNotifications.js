import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { subscribeToPush, pushSupported } from '../lib/push'

const SUPPORTED = typeof window !== 'undefined' && 'Notification' in window

export function notificationsSupported() {
  return SUPPORTED
}

// If permission was already granted in a past session, make sure this device's
// push subscription is registered (e.g. after a new login or SW update).
export function usePushSync() {
  const { session } = useAuthStore()
  useEffect(() => {
    if (!session || !SUPPORTED || !pushSupported()) return
    if (Notification.permission === 'granted') {
      subscribeToPush(session.user.id)
    }
  }, [session])
}

// Permission state + request trigger for the enable button.
// On grant, registers the push subscription for this user.
export function useNotificationPermission() {
  const { session } = useAuthStore()
  const [permission, setPermission] = useState(
    SUPPORTED ? Notification.permission : 'unsupported'
  )

  const request = useCallback(async () => {
    if (!SUPPORTED) return 'unsupported'
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted' && session) {
      await subscribeToPush(session.user.id)
    }
    return result
  }, [session])

  return { permission, request, supported: SUPPORTED }
}
