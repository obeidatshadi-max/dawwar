import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PhoneStep from './PhoneStep'

vi.mock('../../hooks/useAuth', () => ({
  loginWithPhonePin: vi.fn(),
  signupWithPhonePin: vi.fn().mockResolvedValue(undefined),
  signInAnonymous: vi.fn().mockResolvedValue(undefined),
}))

function fill(phone = '07712345678', pin = '123456') {
  fireEvent.change(screen.getByPlaceholderText('07XX XXX XXXX'), { target: { value: phone } })
  fireEvent.change(screen.getByPlaceholderText('● ● ● ● ● ●'), { target: { value: pin } })
}

describe('PhoneStep (phone + PIN)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders phone and PIN inputs', () => {
    render(<PhoneStep />)
    expect(screen.getByPlaceholderText('07XX XXX XXXX')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('● ● ● ● ● ●')).toBeInTheDocument()
  })

  it('submit disabled until phone + 6-digit PIN', () => {
    render(<PhoneStep />)
    const btn = screen.getByRole('button', { name: /دخول \/ تسجيل/ })
    expect(btn).toBeDisabled()
    fill()
    expect(btn).not.toBeDisabled()
  })

  it('existing user → loginWithPhonePin', async () => {
    const { loginWithPhonePin } = await import('../../hooks/useAuth')
    loginWithPhonePin.mockResolvedValueOnce(undefined)
    render(<PhoneStep />)
    fill()
    fireEvent.click(screen.getByRole('button', { name: /دخول \/ تسجيل/ }))
    await waitFor(() => expect(loginWithPhonePin).toHaveBeenCalledWith('07712345678', '123456', 'IQ'))
  })

  it('new user → both country logins fail, falls back to signup', async () => {
    const { loginWithPhonePin, signupWithPhonePin } = await import('../../hooks/useAuth')
    // IQ login fails, JO login fails, post-signup login succeeds
    loginWithPhonePin
      .mockRejectedValueOnce(new Error('Invalid login credentials'))
      .mockRejectedValueOnce(new Error('Invalid login credentials'))
      .mockResolvedValueOnce(undefined)
    render(<PhoneStep />)
    fill()
    fireEvent.click(screen.getByRole('button', { name: /دخول \/ تسجيل/ }))
    await waitFor(() => expect(signupWithPhonePin).toHaveBeenCalled())
  })

  it('wrong PIN for existing user → shows error', async () => {
    const { loginWithPhonePin, signupWithPhonePin } = await import('../../hooks/useAuth')
    loginWithPhonePin.mockRejectedValue(new Error('Invalid login credentials'))
    signupWithPhonePin.mockRejectedValueOnce(new Error('User already registered'))
    render(<PhoneStep />)
    fill()
    fireEvent.click(screen.getByRole('button', { name: /دخول \/ تسجيل/ }))
    await waitFor(() => expect(screen.getByText('الرمز السري غير صحيح لهذا الرقم.')).toBeInTheDocument())
  })

  it('quick start calls signInAnonymous', async () => {
    const { signInAnonymous } = await import('../../hooks/useAuth')
    render(<PhoneStep />)
    fireEvent.click(screen.getByRole('button', { name: /تجربة سريعة بدون رقم/ }))
    await waitFor(() => expect(signInAnonymous).toHaveBeenCalled())
  })
})
