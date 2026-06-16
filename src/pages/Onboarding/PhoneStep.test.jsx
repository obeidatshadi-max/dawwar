import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PhoneStep from './PhoneStep'

vi.mock('../../hooks/useAuth', () => ({
  sendEmailOTP: vi.fn().mockResolvedValue(undefined),
}))

describe('PhoneStep (email mode)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders email input', () => {
    render(<PhoneStep onNext={vi.fn()} />)
    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument()
  })

  it('calls onNext with email when submitted', async () => {
    const onNext = vi.fn()
    render(<PhoneStep onNext={onNext} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /التالي/ }))
    await waitFor(() => expect(onNext).toHaveBeenCalledWith('test@example.com'))
  })

  it('does not call onNext when email missing @', () => {
    const onNext = vi.fn()
    render(<PhoneStep onNext={onNext} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'notanemail' } })
    fireEvent.click(screen.getByRole('button', { name: /التالي/ }))
    expect(onNext).not.toHaveBeenCalled()
  })

  it('shows Arabic error when sendEmailOTP rejects', async () => {
    const { sendEmailOTP } = await import('../../hooks/useAuth')
    sendEmailOTP.mockRejectedValueOnce(new Error('network error'))
    const onNext = vi.fn()
    render(<PhoneStep onNext={onNext} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /التالي/ }))
    await waitFor(() => expect(screen.getByText('تعذر إرسال الرمز. تحقق من البريد الإلكتروني.')).toBeInTheDocument())
    expect(onNext).not.toHaveBeenCalled()
  })
})
