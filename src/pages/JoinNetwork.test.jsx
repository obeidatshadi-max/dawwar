import { render, screen, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock react-router-dom — factory uses no external vars (hoisting-safe)
vi.mock('react-router-dom', () => ({
  useSearchParams: vi.fn(),
  useNavigate: vi.fn(),
}))

// Mock supabase — factory uses no external vars (hoisting-safe)
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

// Mock authStore — factory uses no external vars (hoisting-safe)
vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

import JoinNetwork from './JoinNetwork'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

describe('JoinNetwork', () => {
  const mockNavigate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useNavigate.mockReturnValue(mockNavigate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('no token → shows error message', async () => {
    const params = new URLSearchParams() // no token
    useSearchParams.mockReturnValue([params])
    useAuthStore.mockReturnValue({ session: null, loading: false })

    render(<JoinNetwork />)

    await waitFor(() => {
      expect(screen.getByText('رابط الدعوة غير صالح')).toBeInTheDocument()
    })
  })

  it('not logged in → saves token + redirects to /onboarding', async () => {
    const token = 'test-token-123'
    const params = new URLSearchParams({ token })
    useSearchParams.mockReturnValue([params])
    useAuthStore.mockReturnValue({ session: null, loading: false })

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

    render(<JoinNetwork />)

    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalledWith('pending_invite_token', token)
      expect(mockNavigate).toHaveBeenCalledWith('/onboarding', { replace: true })
    })

    setItemSpy.mockRestore()
  })

  it('valid invite → joins network + redirects to /feed', async () => {
    const token = 'valid-token-abc'
    const params = new URLSearchParams({ token })
    useSearchParams.mockReturnValue([params])
    useAuthStore.mockReturnValue({
      session: { user: { id: 'user-uuid-123' } },
      loading: false,
    })

    const futureDate = new Date(Date.now() + 86400000).toISOString()
    const invite = {
      id: 'invite-id-1',
      network_id: 'network-uuid-1',
      expires_at: futureDate,
      max_uses: 10,
      uses_count: 3,
    }

    // Chain: supabase.from('network_invites').select(...).eq(...).single()
    const mockSingle = vi.fn().mockResolvedValue({ data: invite, error: null })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    // Chain: supabase.from('network_invites').update(...).eq(...)
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq })
    // Chain: supabase.from('network_members').upsert(...)
    const mockUpsert = vi.fn().mockResolvedValue({ error: null })

    supabase.from.mockImplementation((table) => {
      if (table === 'network_invites') return { select: mockSelect, update: mockUpdate }
      if (table === 'network_members') return { upsert: mockUpsert }
      return {}
    })

    vi.useFakeTimers({ shouldAdvanceTime: true })

    render(<JoinNetwork />)

    // Wait for success state (async join completed)
    await waitFor(() => {
      expect(screen.getByText('تم الانضمام! جارٍ التوجيه...')).toBeInTheDocument()
    }, { timeout: 3000 })

    // Advance the 1500ms setTimeout
    await act(async () => {
      vi.advanceTimersByTime(1500)
    })

    expect(mockNavigate).toHaveBeenCalledWith('/feed', { replace: true })
  })

  it('expired invite → shows error', async () => {
    const token = 'expired-token'
    const params = new URLSearchParams({ token })
    useSearchParams.mockReturnValue([params])
    useAuthStore.mockReturnValue({
      session: { user: { id: 'user-uuid-123' } },
      loading: false,
    })

    const pastDate = new Date(Date.now() - 86400000).toISOString()
    const invite = {
      id: 'invite-id-2',
      network_id: 'network-uuid-2',
      expires_at: pastDate,
      max_uses: 10,
      uses_count: 2,
    }

    const mockSingle = vi.fn().mockResolvedValue({ data: invite, error: null })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })

    supabase.from.mockImplementation((table) => {
      if (table === 'network_invites') return { select: mockSelect, update: vi.fn().mockReturnValue({ eq: vi.fn() }) }
      return {}
    })

    render(<JoinNetwork />)

    await waitFor(() => {
      expect(screen.getByText('انتهت صلاحية الدعوة')).toBeInTheDocument()
    })
  })

  it('full invite → shows error when uses_count >= max_uses', async () => {
    const token = 'full-token'
    const params = new URLSearchParams({ token })
    useSearchParams.mockReturnValue([params])
    useAuthStore.mockReturnValue({
      session: { user: { id: 'user-uuid-123' } },
      loading: false,
    })

    const futureDate = new Date(Date.now() + 86400000).toISOString()
    const invite = {
      id: 'invite-id-3',
      network_id: 'network-uuid-3',
      expires_at: futureDate,
      max_uses: 5,
      uses_count: 5, // at capacity
    }

    const mockSingle = vi.fn().mockResolvedValue({ data: invite, error: null })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })

    supabase.from.mockImplementation((table) => {
      if (table === 'network_invites') return { select: mockSelect, update: vi.fn().mockReturnValue({ eq: vi.fn() }) }
      return {}
    })

    render(<JoinNetwork />)

    await waitFor(() => {
      expect(screen.getByText('تم الوصول إلى الحد الأقصى لعدد الأعضاء')).toBeInTheDocument()
    })
  })

  it('invite not found → shows error', async () => {
    const token = 'nonexistent-token'
    const params = new URLSearchParams({ token })
    useSearchParams.mockReturnValue([params])
    useAuthStore.mockReturnValue({
      session: { user: { id: 'user-uuid-123' } },
      loading: false,
    })

    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'No rows returned' } })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })

    supabase.from.mockImplementation((table) => {
      if (table === 'network_invites') return { select: mockSelect, update: vi.fn().mockReturnValue({ eq: vi.fn() }) }
      return {}
    })

    render(<JoinNetwork />)

    await waitFor(() => {
      expect(screen.getByText('الدعوة غير موجودة')).toBeInTheDocument()
    })
  })
})
