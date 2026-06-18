import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

let authCallback
let resolveProfile
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((cb) => {
        authCallback = cb
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(() => new Promise((res) => { resolveProfile = res })),
    })),
  },
}))

import { useAuthInit } from './useAuth'
import { useAuthStore } from '../store/authStore'

describe('useAuthInit', () => {
  beforeEach(() => {
    useAuthStore.setState({ session: null, profile: null, loading: true })
  })

  it('clears loading on first auth event before the profile resolves', async () => {
    renderHook(() => useAuthInit())
    authCallback('INITIAL_SESSION', { user: { id: 'u1' } })
    await waitFor(() => expect(useAuthStore.getState().loading).toBe(false))
    // profile fetch still pending
    expect(useAuthStore.getState().profile).toBe(null)
    // resolve it afterwards
    resolveProfile({ data: { id: 'u1', pharmacy_name: 'صيدلية' }, error: null })
    await waitFor(() => expect(useAuthStore.getState().profile?.id).toBe('u1'))
  })
})
