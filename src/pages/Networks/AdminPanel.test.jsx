import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AdminPanel from './AdminPanel'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    session: { user: { id: 'admin-id' } },
  })),
}))

import { supabase } from '../../lib/supabase'

const mockNetwork = { id: 'net-1', name: 'شبكة الشمال', city: 'عمّان', country: 'JO' }
const mockMembers = [
  {
    id: 'mem-1',
    role: 'admin',
    joined_at: new Date().toISOString(),
    profile: { id: 'admin-id', pharmacy_name: 'صيدلية أ', city: 'عمّان' },
  },
  {
    id: 'mem-2',
    role: 'member',
    joined_at: new Date().toISOString(),
    profile: { id: 'other-id', pharmacy_name: 'صيدلية ب', city: 'عمّان' },
  },
]

function setupMocks() {
  const netChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: mockNetwork, error: null }),
  }
  const memChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => resolve({ data: mockMembers, error: null })),
    catch: vi.fn().mockReturnThis(),
  }
  supabase.from.mockImplementation((table) => {
    if (table === 'networks') return netChain
    return memChain
  })
}

function wrap() {
  return render(
    <MemoryRouter initialEntries={['/networks/net-1/admin']}>
      <Routes>
        <Route path="/networks/:networkId/admin" element={<AdminPanel />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('AdminPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('shows network name after loading', async () => {
    wrap()
    await waitFor(() => expect(screen.getByText('شبكة الشمال')).toBeInTheDocument())
  })

  it('shows member list', async () => {
    wrap()
    await waitFor(() => expect(screen.getByText('صيدلية ب')).toBeInTheDocument())
  })

  it('does not show remove button for self (admin)', async () => {
    wrap()
    await waitFor(() => screen.getByText('صيدلية أ'))
    const removeButtons = screen.queryAllByText('إزالة')
    expect(removeButtons).toHaveLength(1)
  })

  it('shows invite generator UI', async () => {
    wrap()
    await waitFor(() => expect(screen.getByText('توليد رابط الدعوة')).toBeInTheDocument())
  })
})
