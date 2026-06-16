import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../hooks/useMessages', () => ({
  useUnreadCount: vi.fn(() => 0),
}))

import { useUnreadCount } from '../hooks/useMessages'
import BottomNav from './BottomNav'

function wrap(ui) {
  return render(<MemoryRouter initialEntries={['/feed']}>{ui}</MemoryRouter>)
}

describe('BottomNav', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders all four tabs', () => {
    wrap(<BottomNav />)
    expect(screen.getByText('الرئيسية')).toBeInTheDocument()
    expect(screen.getByText('الرسائل')).toBeInTheDocument()
    expect(screen.getByText('شبكاتي')).toBeInTheDocument()
    expect(screen.getByText('حسابي')).toBeInTheDocument()
  })

  it('shows unread badge when unread > 0', () => {
    useUnreadCount.mockReturnValue(3)
    wrap(<BottomNav />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('does not show badge when unread = 0', () => {
    useUnreadCount.mockReturnValue(0)
    wrap(<BottomNav />)
    expect(screen.queryByText('0')).toBeNull()
  })
})
