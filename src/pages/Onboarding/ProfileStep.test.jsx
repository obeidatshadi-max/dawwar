import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProfileStep from './ProfileStep'

describe('ProfileStep', () => {
  it('renders all required fields in Arabic', () => {
    render(<ProfileStep onNext={vi.fn()} />)
    expect(screen.getByPlaceholderText('اسم الصيدلية')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('اسم المالك')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('رقم الواتساب')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('المدينة')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'البلد' })).toBeInTheDocument()
  })

  it('submit button disabled until all fields filled', () => {
    render(<ProfileStep onNext={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'التالي' })
    expect(btn).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText('اسم الصيدلية'), { target: { value: 'صيدلية النور' } })
    expect(btn).toBeDisabled() // still missing fields
  })

  it('calls onNext with correct profile data when form complete', () => {
    const onNext = vi.fn()
    render(<ProfileStep onNext={onNext} />)
    fireEvent.change(screen.getByPlaceholderText('اسم الصيدلية'), { target: { value: 'صيدلية النور' } })
    fireEvent.change(screen.getByPlaceholderText('اسم المالك'), { target: { value: 'أحمد' } })
    fireEvent.change(screen.getByPlaceholderText('رقم الواتساب'), { target: { value: '0791234567' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'البلد' }), { target: { value: 'IQ' } })
    fireEvent.change(screen.getByPlaceholderText('المدينة'), { target: { value: 'بغداد' } })
    fireEvent.click(screen.getByRole('button', { name: 'التالي' }))
    expect(onNext).toHaveBeenCalledWith({
      pharmacy_name: 'صيدلية النور',
      owner_name: 'أحمد',
      phone: '0791234567',
      city: 'بغداد',
      country: 'IQ',
    })
  })

  it('does not call onNext when form is incomplete', () => {
    const onNext = vi.fn()
    render(<ProfileStep onNext={onNext} />)
    fireEvent.click(screen.getByRole('button', { name: 'التالي' }))
    expect(onNext).not.toHaveBeenCalled()
  })

  it('does not call onNext when fields are whitespace only', () => {
    const onNext = vi.fn()
    render(<ProfileStep onNext={onNext} />)
    fireEvent.change(screen.getByPlaceholderText('اسم الصيدلية'), { target: { value: '   ' } })
    fireEvent.change(screen.getByPlaceholderText('اسم المالك'), { target: { value: '   ' } })
    fireEvent.change(screen.getByPlaceholderText('رقم الواتساب'), { target: { value: '   ' } })
    fireEvent.change(screen.getByPlaceholderText('المدينة'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'التالي' }))
    expect(onNext).not.toHaveBeenCalled()
  })

  it('accepts initialCountry prop and passes it to onNext', () => {
    const onNext = vi.fn()
    render(<ProfileStep onNext={onNext} initialCountry="IQ" />)
    fireEvent.change(screen.getByPlaceholderText('اسم الصيدلية'), { target: { value: 'صيدلية بغداد' } })
    fireEvent.change(screen.getByPlaceholderText('اسم المالك'), { target: { value: 'علي' } })
    fireEvent.change(screen.getByPlaceholderText('رقم الواتساب'), { target: { value: '07901234567' } })
    fireEvent.change(screen.getByPlaceholderText('المدينة'), { target: { value: 'بغداد' } })
    fireEvent.click(screen.getByRole('button', { name: 'التالي' }))
    expect(onNext).toHaveBeenCalledWith(expect.objectContaining({ country: 'IQ' }))
  })
})
