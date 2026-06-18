import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

const add = vi.fn()
const remove = vi.fn()
vi.mock('../../hooks/useCloseFriends', () => ({
  useCloseFriends: () => ({ friends: [], friendIds: [], loading: false, error: '', add, remove }),
}))
vi.mock('../../hooks/useNetworkMembers', () => ({
  useNetworkMembers: () => ({
    members: [{ id: 'a', pharmacy_name: 'صيدلية أ', city: 'بغداد', country: 'IQ', photo_url: null }],
    loading: false, error: '',
  }),
}))
const navigate = vi.fn()
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))

import CloseFriends from './CloseFriends'

describe('CloseFriends', () => {
  it('shows demo placeholder cards labelled مثال when empty', () => {
    render(<CloseFriends />)
    expect(screen.getByText('الأصدقاء المقرّبون')).toBeInTheDocument()
    expect(screen.getAllByText('مثال').length).toBeGreaterThan(0)
  })

  it('opens picker and adds a member', () => {
    render(<CloseFriends />)
    fireEvent.click(screen.getByRole('button', { name: '＋ إضافة' }))
    fireEvent.click(screen.getByText('صيدلية أ'))
    expect(add).toHaveBeenCalledWith('a')
  })
})
