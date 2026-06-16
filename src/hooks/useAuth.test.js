import { describe, it, expect } from 'vitest'
import { normalizePhone } from './useAuth'

describe('normalizePhone', () => {
  it('handles local Jordan number', () => {
    expect(normalizePhone('0791234567')).toBe('+962791234567')
  })
  it('handles 00 prefix', () => {
    expect(normalizePhone('00962791234567')).toBe('+962791234567')
  })
  it('passes through E.164', () => {
    expect(normalizePhone('+962791234567')).toBe('+962791234567')
  })
  it('strips non-digit prefix but keeps digits', () => {
    expect(normalizePhone('962791234567')).toBe('+962791234567')
  })
})
