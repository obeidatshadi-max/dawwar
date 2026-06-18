import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useFeed } from './useFeed'

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

vi.mock('../lib/mediaUtils', () => ({
  haversineKm: vi.fn((lat1, lng1, lat2, lng2) => Math.abs(lat2 - lat1) * 111),
}))

import { supabase } from '../lib/supabase'

function makeQueryMock(data, error = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => resolve({ data, error })),
    catch: vi.fn().mockReturnThis(),
  }
  supabase.from.mockReturnValue(chain)
  return chain
}

const NETWORK_ID = 'net-1'

const mockPosts = [
  {
    id: 'p1', type: 'offer', product_name: 'Augmentin', status: 'active',
    created_at: '2026-06-16T10:00:00Z', network_id: NETWORK_ID,
    author: { id: 'u1', pharmacy_name: 'صيدلية أ', lat: 31.9, lng: 35.9 },
    media: [],
  },
  {
    id: 'p2', type: 'wanted', product_name: 'Metformin', status: 'active',
    created_at: '2026-06-15T10:00:00Z', network_id: NETWORK_ID,
    author: { id: 'u2', pharmacy_name: 'صيدلية ب', lat: 32.0, lng: 36.0 },
    media: [],
  },
]

describe('useFeed', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('fetches and returns posts', async () => {
    makeQueryMock(mockPosts)
    const { result } = renderHook(() => useFeed({ networkId: NETWORK_ID }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.posts).toHaveLength(2)
  })

  it('filters by type=offer', async () => {
    const chain = makeQueryMock(mockPosts)
    const { result } = renderHook(() => useFeed({ networkId: NETWORK_ID, filter: 'offer' }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(chain.eq).toHaveBeenCalledWith('type', 'offer')
  })

  it('filters by search term', async () => {
    const chain = makeQueryMock([mockPosts[0]])
    const { result } = renderHook(() => useFeed({ networkId: NETWORK_ID, search: 'Augmentin' }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(chain.ilike).toHaveBeenCalledWith('product_name', '%Augmentin%')
  })

  it('annotates posts with distance when viewer coords provided', async () => {
    makeQueryMock(mockPosts)
    const { result } = renderHook(() =>
      useFeed({ networkId: NETWORK_ID, viewerLat: 31.9, viewerLng: 35.9 })
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.posts[0]._distKm).toBeDefined()
  })

  it('sorts by nearest when sortBy=nearest', async () => {
    makeQueryMock(mockPosts)
    const { result } = renderHook(() =>
      useFeed({ networkId: NETWORK_ID, sortBy: 'nearest', viewerLat: 31.9, viewerLng: 35.9 })
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.posts[0].id).toBe('p1')
    expect(result.current.posts[1].id).toBe('p2')
  })

  it('sets error on fetch failure', async () => {
    makeQueryMock(null, new Error('RLS error'))
    const { result } = renderHook(() => useFeed({ networkId: NETWORK_ID }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toContain('RLS error')
  })

  it('filters to close friends when friendIds provided', async () => {
    const chain = makeQueryMock(mockPosts)
    const { result } = renderHook(() => useFeed({ networkId: NETWORK_ID, friendIds: ['u1'] }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(chain.in).toHaveBeenCalledWith('author_id', ['u1'])
  })

  it('returns no posts when friendIds is an empty array', async () => {
    makeQueryMock(mockPosts)
    const { result } = renderHook(() => useFeed({ networkId: NETWORK_ID, friendIds: [] }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.posts).toHaveLength(0)
  })
})
