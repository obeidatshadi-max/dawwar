import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useMessages, useUnreadCount } from './useMessages'

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}))

vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    session: { user: { id: 'me' } },
  })),
}))

import { supabase } from '../lib/supabase'

const mockThreads = [
  {
    id: 'm1', post_id: 'p1', body: 'هل متوفر؟', created_at: new Date().toISOString(), read_at: null,
    sender: { id: 'other', pharmacy_name: 'صيدلية ب' },
    recipient: { id: 'me', pharmacy_name: 'صيدلية أ' },
    post: { id: 'p1', product_name: 'Augmentin', type: 'offer' },
  },
]

function makeChain(data, error = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => resolve({ data, error })),
    catch: vi.fn().mockReturnThis(),
  }
}

describe('useMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabase.from.mockReturnValue(makeChain(mockThreads))
  })

  it('fetches and returns threads', async () => {
    const { result } = renderHook(() => useMessages())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.threads).toHaveLength(1)
    expect(result.current.threads[0].post_id).toBe('p1')
  })

  it('deduplicates threads by post_id', async () => {
    supabase.from.mockReturnValue(makeChain([mockThreads[0], { ...mockThreads[0], id: 'm2' }]))
    const { result } = renderHook(() => useMessages())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.threads).toHaveLength(1)
  })

  it('sets error on fetch failure', async () => {
    supabase.from.mockReturnValue(makeChain(null, new Error('RLS denied')))
    const { result } = renderHook(() => useMessages())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toContain('RLS denied')
  })
})

describe('useUnreadCount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabase.from.mockReturnValue(makeChain(null))
    // override .then to return count
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ count: 5, error: null })),
      catch: vi.fn().mockReturnThis(),
    }
    supabase.from.mockReturnValue(chain)
  })

  it('returns unread count from supabase', async () => {
    const { result } = renderHook(() => useUnreadCount())
    await waitFor(() => expect(result.current).toBe(5))
  })
})
