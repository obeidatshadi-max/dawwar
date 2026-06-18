import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

vi.mock('../lib/supabase', () => ({ supabase: { from: vi.fn() } }))
vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({ session: { user: { id: 'me' } } }),
}))

import { supabase } from '../lib/supabase'
import { useNetworkMembers } from './useNetworkMembers'

function mockMembers(memberRows) {
  let call = 0
  supabase.from.mockImplementation(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => {
      call += 1
      if (call === 1) return resolve({ data: [{ network_id: 'n1' }], error: null })
      return resolve({ data: memberRows, error: null })
    }),
  }))
}

describe('useNetworkMembers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns deduped members excluding self', async () => {
    mockMembers([
      { profile: { id: 'a', pharmacy_name: 'A', city: 'بغداد', country: 'IQ', photo_url: null } },
      { profile: { id: 'a', pharmacy_name: 'A', city: 'بغداد', country: 'IQ', photo_url: null } },
      { profile: { id: 'me', pharmacy_name: 'Me', city: 'بغداد', country: 'IQ', photo_url: null } },
      { profile: { id: 'b', pharmacy_name: 'B', city: 'البصرة', country: 'IQ', photo_url: null } },
    ])
    const { result } = renderHook(() => useNetworkMembers())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.members.map((m) => m.id)).toEqual(['a', 'b'])
  })

  it('returns empty members and skips the second query when user belongs to zero networks', async () => {
    // .in() is only used by the second query (members of my networks). With no
    // networks the hook must return early, so .in() must never be called.
    const inMock = vi.fn().mockReturnThis()
    supabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: inMock,
      then: vi.fn((resolve) => resolve({ data: [], error: null })),
    }))
    const { result } = renderHook(() => useNetworkMembers())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.members).toEqual([])
    expect(inMock).not.toHaveBeenCalled()
  })
})
