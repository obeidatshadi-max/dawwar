import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Profile from './Profile'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    })),
    auth: { signOut: vi.fn().mockResolvedValue({}) },
  },
}))

const mockProfile = {
  id: 'user-1',
  pharmacy_name: 'صيدلية النور',
  owner_name: 'أحمد محمد',
  phone: '+96279000001',
  city: 'عمّان',
  country: 'JO',
  location_label: 'عمّان — الشميساني',
}

const mockClear = vi.fn()
const mockSetProfile = vi.fn()

vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    profile: mockProfile,
    setProfile: mockSetProfile,
    clear: mockClear,
  })),
}))

function wrap() {
  return render(<MemoryRouter><Profile /></MemoryRouter>)
}

describe('Profile', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows pharmacy name and city', () => {
    wrap()
    expect(screen.getByText('صيدلية النور')).toBeInTheDocument()
    expect(screen.getAllByText(/عمّان/).length).toBeGreaterThan(0)
  })

  it('shows edit button and enters edit mode on click', async () => {
    wrap()
    await userEvent.click(screen.getByText('تعديل'))
    expect(screen.getByDisplayValue('صيدلية النور')).toBeInTheDocument()
  })

  it('shows validation error when required field empty', async () => {
    wrap()
    await userEvent.click(screen.getByText('تعديل'))
    const pharmacyInput = screen.getByDisplayValue('صيدلية النور')
    await userEvent.clear(pharmacyInput)
    await userEvent.click(screen.getByText('حفظ'))
    expect(screen.getByText('جميع الحقول مطلوبة')).toBeInTheDocument()
  })

  it('shows logout button', () => {
    wrap()
    expect(screen.getByText('تسجيل الخروج')).toBeInTheDocument()
  })

  it('calls signOut and clear on logout', async () => {
    const { supabase } = await import('../../lib/supabase')
    wrap()
    await userEvent.click(screen.getByText('تسجيل الخروج'))
    expect(supabase.auth.signOut).toHaveBeenCalled()
    expect(mockClear).toHaveBeenCalled()
  })

  it('renders the pharmacy photo when photo_url is present', async () => {
    const { useAuthStore } = await import('../../store/authStore')
    useAuthStore.mockReturnValue({
      profile: { ...mockProfile, photo_url: 'https://x/pharmacy/user-1.jpg' },
      setProfile: mockSetProfile,
      clear: mockClear,
    })
    const { container } = wrap()
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://x/pharmacy/user-1.jpg')
  })
})
