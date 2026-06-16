import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Networks from './Networks'

vi.mock('../../hooks/useNetworks', () => ({
  useNetworks: vi.fn(),
}))

vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn(() => ({ profile: { city: 'عمّان', country: 'JO' } })),
}))

import { useNetworks } from '../../hooks/useNetworks'

function wrap(ui) {
  return render(<MemoryRouter initialEntries={['/networks']}>{ui}</MemoryRouter>)
}

describe('Networks', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows spinner while loading', () => {
    useNetworks.mockReturnValue({ networks: [], loading: true, error: '' })
    const { container } = wrap(<Networks />)
    expect(container.querySelector('.animate-spin')).toBeTruthy()
  })

  it('shows empty state when no networks', () => {
    useNetworks.mockReturnValue({ networks: [], loading: false, error: '' })
    wrap(<Networks />)
    expect(screen.getByText('لا توجد شبكات بعد')).toBeInTheDocument()
  })

  it('lists network name and role badge for admin', () => {
    useNetworks.mockReturnValue({
      networks: [{ id: 'n1', name: 'شبكة الشمال', city: 'عمّان', country: 'JO', role: 'admin' }],
      loading: false,
      error: '',
    })
    wrap(<Networks />)
    expect(screen.getByText('شبكة الشمال')).toBeInTheDocument()
    expect(screen.getByText('مدير')).toBeInTheDocument()
  })

  it('does not show admin badge for member role', () => {
    useNetworks.mockReturnValue({
      networks: [{ id: 'n1', name: 'شبكة الجنوب', city: 'إربد', country: 'JO', role: 'member' }],
      loading: false,
      error: '',
    })
    wrap(<Networks />)
    expect(screen.queryByText('مدير')).toBeNull()
  })

  it('shows إدارة button for admin only', () => {
    useNetworks.mockReturnValue({
      networks: [{ id: 'n1', name: 'شبكة أ', city: 'عمّان', country: 'JO', role: 'admin' }],
      loading: false,
      error: '',
    })
    wrap(<Networks />)
    expect(screen.getByText('إدارة')).toBeInTheDocument()
  })
})
