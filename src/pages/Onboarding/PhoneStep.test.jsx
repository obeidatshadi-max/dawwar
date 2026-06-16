import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PhoneStep from './PhoneStep'

// Mock the useAuth hook
vi.mock('../../hooks/useAuth', () => ({
  sendOTP: vi.fn().mockResolvedValue(undefined),
}))

describe('PhoneStep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Arabic phone input', () => {
    render(<PhoneStep onNext={vi.fn()} country="JO" />)
    expect(screen.getByPlaceholderText(/0791/)).toBeInTheDocument()
  })

  it('calls onNext with phone when form submitted', async () => {
    const onNext = vi.fn()
    render(<PhoneStep onNext={onNext} country="JO" />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '0791234567' } })
    fireEvent.click(screen.getByRole('button', { name: /التالي/ }))
    await waitFor(() => {
      expect(onNext).toHaveBeenCalledWith('0791234567')
    })
  })

  it('does not call onNext when phone is empty', () => {
    const onNext = vi.fn()
    render(<PhoneStep onNext={onNext} country="JO" />)
    fireEvent.click(screen.getByRole('button', { name: /التالي/ }))
    expect(onNext).not.toHaveBeenCalled()
  })

  it('shows Arabic error when sendOTP rejects', async () => {
    const { sendOTP } = await import('../../hooks/useAuth')
    sendOTP.mockRejectedValueOnce(new Error('network error'))
    const onNext = vi.fn()
    render(<PhoneStep onNext={onNext} country="JO" />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '0791234567' } })
    fireEvent.click(screen.getByRole('button', { name: /التالي/ }))
    await waitFor(() => expect(screen.getByText('تعذر إرسال الرمز. تأكد من الرقم.')).toBeInTheDocument())
    expect(onNext).not.toHaveBeenCalled()
  })
})
