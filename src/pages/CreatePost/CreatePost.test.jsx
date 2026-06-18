import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Step1Product from './Step1Product'
import Step2Price from './Step2Price'

vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    profile: { phone: '+96279000001', country: 'JO', pharmacy_name: 'صيدلية أ', city: 'عمّان' },
    session: { user: { id: 'user-1' } },
  })),
}))

vi.mock('../../hooks/useNetworks', () => ({
  useNetworks: vi.fn(() => ({ networks: [{ id: 'net-1', name: 'شبكة أ' }], loading: false })),
}))

function wrap(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('Step1Product', () => {
  it('renders offer/wanted toggle', () => {
    wrap(<Step1Product onNext={vi.fn()} />)
    expect(screen.getByText('عرض')).toBeInTheDocument()
    expect(screen.getByText('مطلوب')).toBeInTheDocument()
  })

  it('shows expiry date field for offers', () => {
    wrap(<Step1Product onNext={vi.fn()} />)
    expect(screen.getByLabelText(/تاريخ انتهاء/)).toBeInTheDocument()
  })

  it('hides expiry date for wanted type', async () => {
    wrap(<Step1Product onNext={vi.fn()} />)
    await userEvent.click(screen.getByText('مطلوب'))
    expect(screen.queryByLabelText(/تاريخ انتهاء/)).toBeNull()
  })

  it('shows error when product name empty', async () => {
    wrap(<Step1Product onNext={vi.fn()} />)
    await userEvent.click(screen.getByText('التالي'))
    expect(screen.getByText('اسم المنتج مطلوب')).toBeInTheDocument()
  })

  it('calls onNext with correct payload', async () => {
    const onNext = vi.fn()
    wrap(<Step1Product onNext={onNext} />)

    const productInput = screen.getByPlaceholderText(/Augmentin/)
    await userEvent.type(productInput, 'Amoxicillin 500mg')

    // Set quantity — find the number input
    const inputs = screen.getAllByRole('spinbutton')
    fireEvent.change(inputs[0], { target: { value: '5' } })

    // Set expiry date
    const dateInput = screen.getByDisplayValue('')
    fireEvent.change(dateInput, { target: { value: '2026-12-31' } })

    await userEvent.click(screen.getByText('التالي'))

    expect(onNext).toHaveBeenCalledWith(expect.objectContaining({
      type: 'offer',
      product_name: 'Amoxicillin 500mg',
      quantity: 5,
      expiry_date: '2026-12-31',
    }))
  })
})

describe('Step2Price (offer)', () => {
  it('shows price fields and currency selector', () => {
    wrap(<Step2Price type="offer" onNext={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText(/السعر الأصلي/)).toBeInTheDocument()
    expect(screen.getByText(/سعر البيع/)).toBeInTheDocument()
    expect(screen.getByText(/العملة/)).toBeInTheDocument()
  })

  it('calculates discount % live from original + sale price', async () => {
    wrap(<Step2Price type="offer" onNext={vi.fn()} onBack={vi.fn()} />)
    const inputs = screen.getAllByRole('spinbutton') // [original, discount, sale]
    fireEvent.change(inputs[0], { target: { value: '10' } })
    fireEvent.change(inputs[2], { target: { value: '7' } })
    await waitFor(() => {
      expect(screen.getByText(/خصم 30/)).toBeInTheDocument()
    })
  })

  it('computes sale price from original + discount %', async () => {
    wrap(<Step2Price type="offer" onNext={vi.fn()} onBack={vi.fn()} />)
    const inputs = screen.getAllByRole('spinbutton') // [original, discount, sale]
    fireEvent.change(inputs[0], { target: { value: '100' } })
    fireEvent.change(inputs[1], { target: { value: '25' } })
    await waitFor(() => {
      expect(inputs[2].value).toBe('75')
    })
  })

  it('shows only phone + urgency note for wanted type', () => {
    wrap(<Step2Price type="wanted" onNext={vi.fn()} onBack={vi.fn()} />)
    expect(screen.queryByText(/السعر الأصلي/)).toBeNull()
    expect(screen.getByText(/ملاحظة الإلحاحية/)).toBeInTheDocument()
  })

  it('pre-fills phone from profile', () => {
    wrap(<Step2Price type="offer" onNext={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByDisplayValue('+96279000001')).toBeInTheDocument()
  })
})
