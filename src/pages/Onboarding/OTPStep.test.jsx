import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../../hooks/useAuth', () => ({
  verifyOTP: vi.fn().mockResolvedValue(undefined),
}))

import OTPStep from './OTPStep'
import { verifyOTP } from '../../hooks/useAuth'

describe('OTPStep', () => {
  it('renders 6-digit OTP input', () => {
    render(<OTPStep phone="0791234567" country="JO" onNext={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByPlaceholderText('000000')).toBeInTheDocument()
  })

  it('strips non-digits from input', () => {
    render(<OTPStep phone="0791234567" country="JO" onNext={vi.fn()} onBack={vi.fn()} />)
    const input = screen.getByPlaceholderText('000000')
    fireEvent.change(input, { target: { value: '12a3b4' } })
    expect(input.value).toBe('1234')
  })

  it('submit button disabled until 6 digits entered', () => {
    render(<OTPStep phone="0791234567" country="JO" onNext={vi.fn()} onBack={vi.fn()} />)
    const button = screen.getByRole('button', { name: /تأكيد/ })
    expect(button).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } })
    expect(button).not.toBeDisabled()
  })

  it('calls onNext after successful OTP verify', async () => {
    const onNext = vi.fn()
    render(<OTPStep phone="0791234567" country="JO" onNext={onNext} onBack={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: /تأكيد/ }))
    await waitFor(() => expect(onNext).toHaveBeenCalled())
  })

  it('shows Arabic error on verifyOTP rejection', async () => {
    verifyOTP.mockRejectedValueOnce(new Error('invalid'))
    render(<OTPStep phone="0791234567" country="JO" onNext={vi.fn()} onBack={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '999999' } })
    fireEvent.click(screen.getByRole('button', { name: /تأكيد/ }))
    await waitFor(() => expect(screen.getByText('الرمز غير صحيح أو انتهت صلاحيته.')).toBeInTheDocument())
  })

  it('calls onBack when back button clicked', () => {
    const onBack = vi.fn()
    render(<OTPStep phone="0791234567" country="JO" onNext={vi.fn()} onBack={onBack} />)
    fireEvent.click(screen.getByRole('button', { name: /تغيير الرقم/ }))
    expect(onBack).toHaveBeenCalled()
  })
})
