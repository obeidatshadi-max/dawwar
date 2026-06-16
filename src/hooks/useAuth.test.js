import { describe, it, expect } from 'vitest'
import { normalizePhone } from './useAuth'

describe('normalizePhone — Jordan (default)', () => {
  it('handles local Jordan number (0-prefix → +962)', () => {
    expect(normalizePhone('0791234567')).toBe('+962791234567')
  })
  it('handles 00 prefix', () => {
    expect(normalizePhone('00962791234567')).toBe('+962791234567')
  })
  it('passes through E.164', () => {
    expect(normalizePhone('+962791234567')).toBe('+962791234567')
  })
  it('handles bare digits (no prefix)', () => {
    expect(normalizePhone('962791234567')).toBe('+962791234567')
  })
})

describe('normalizePhone — Iraq', () => {
  it('handles local Iraq number (0-prefix → +964)', () => {
    expect(normalizePhone('07901234567', 'IQ')).toBe('+9647901234567')
  })
  it('handles 00964 prefix', () => {
    expect(normalizePhone('009647901234567', 'IQ')).toBe('+9647901234567')
  })
  it('passes through E.164 Iraq', () => {
    expect(normalizePhone('+9647901234567', 'IQ')).toBe('+9647901234567')
  })
})
