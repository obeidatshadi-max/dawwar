import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PhoneStep from './PhoneStep'

vi.mock('../../hooks/useAuth', () => ({
  sendMagicLink: vi.fn().mockResolvedValue(undefined),
}))

describe('PhoneStep (magic link)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders email input', () => {
    render(<PhoneStep onNext={vi.fn()} />)
    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument()
  })

  it('submit button labeled إرسال الرابط', () => {
    render(<PhoneStep onNext={vi.fn()} />)
    expect(screen.getByRole('button', { name: /إرسال الرابط/ })).toBeInTheDocument()
  })

  it('shows waiting screen after successful send', async () => {
    render(<PhoneStep onNext={vi.fn()} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /إرسال الرابط/ }))
    await waitFor(() => expect(screen.getByText('تفقد بريدك الإلكتروني')).toBeInTheDocument())
  })

  it('submit button disabled when email missing @', () => {
    render(<PhoneStep onNext={vi.fn()} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'notanemail' } })
    expect(screen.getByRole('button', { name: /إرسال الرابط/ })).toBeDisabled()
  })

  it('shows Arabic error when sendMagicLink rejects', async () => {
    const { sendMagicLink } = await import('../../hooks/useAuth')
    sendMagicLink.mockRejectedValueOnce(new Error('network error'))
    render(<PhoneStep onNext={vi.fn()} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /إرسال الرابط/ }))
    await waitFor(() => expect(screen.getByText('تعذر إرسال الرابط. تحقق من البريد الإلكتروني.')).toBeInTheDocument())
  })

  it('تغيير البريد button resets to input screen', async () => {
    render(<PhoneStep onNext={vi.fn()} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /إرسال الرابط/ }))
    await waitFor(() => screen.getByText('تفقد بريدك الإلكتروني'))
    fireEvent.click(screen.getByRole('button', { name: /تغيير البريد الإلكتروني/ }))
    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument()
  })
})
