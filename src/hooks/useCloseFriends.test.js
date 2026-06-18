import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

const calls = []
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({
        data: [{ friend: { id: 'a', pharmacy_name: 'A', city: 'بغداد', country: 'IQ', photo_url: null } }],
        error: null,
      })),
      insert: vi.fn((row) => { calls.push(['insert', row]); return Promise.resolve({ error: null }) }),
      delete: vi.fn(() => ({
        eq: vi.fn().mockReturnThis(),
        match: vi.fn((m) => { calls.push(['delete', m]); return Promise.resolve({ error: null }) }),
      })),
    })),
  },
}))
vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({ session: { user: { id: 'me' } } }),
}))

import { useCloseFriends } from './useCloseFriends'

describe('useCloseFriends', () => {
  beforeEach(() => { calls.length = 0 })

  it('lists friends and exposes friendIds', async () => {
    const { result } = renderHook(() => useCloseFriends())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.friends).toHaveLength(1)
    expect(result.current.friendIds).toEqual(['a'])
  })

  it('add() inserts a row with owner and friend ids', async () => {
    const { result } = renderHook(() => useCloseFriends())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.add('b') })
    expect(calls).toContainEqual(['insert', { owner_id: 'me', friend_profile_id: 'b' }])
  })

  it('remove() deletes the matching row', async () => {
    const { result } = renderHook(() => useCloseFriends())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.remove('a') })
    expect(calls).toContainEqual(['delete', { owner_id: 'me', friend_profile_id: 'a' }])
  })
})
