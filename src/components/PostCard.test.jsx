import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PostCard from './PostCard'

const basePost = {
  id: 'p1',
  type: 'offer',
  product_name: 'Augmentin 625mg',
  quantity: 10,
  unit: 'علبة',
  price: 8,
  original_price: 12,
  currency: 'JOD',
  expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  phone: '+96279000001',
  author: { pharmacy_name: 'صيدلية النور', city: 'عمّان', lat: 31.9, lng: 35.9 },
  media: [],
}

describe('PostCard', () => {
  it('shows offer badge for type=offer', () => {
    render(<PostCard post={basePost} />)
    expect(screen.getByText('عرض')).toBeInTheDocument()
  })

  it('shows wanted badge for type=wanted', () => {
    render(<PostCard post={{ ...basePost, type: 'wanted' }} />)
    expect(screen.getByText('مطلوب')).toBeInTheDocument()
  })

  it('shows product name and pharmacy', () => {
    render(<PostCard post={basePost} />)
    expect(screen.getByText('Augmentin 625mg')).toBeInTheDocument()
    expect(screen.getByText(/صيدلية النور/)).toBeInTheDocument()
  })

  it('calculates and shows discount percentage', () => {
    render(<PostCard post={basePost} />)  // 8/12 = 33%
    expect(screen.getByText('-33%')).toBeInTheDocument()
  })

  it('shows colour-coded expiry date for offers', () => {
    render(<PostCard post={basePost} />)
    const expiryEl = screen.getByText(/انتهاء:/)
    expect(expiryEl).toBeInTheDocument()
    // colour-coded by bucket, not the neutral muted class
    expect(expiryEl.className).not.toContain('text-brand-muted')
  })

  it('WhatsApp link has correct wa.me URL with pre-filled message', () => {
    render(<PostCard post={basePost} />)
    const waBtn = screen.getByText('واتساب').closest('a')
    expect(waBtn.href).toContain('wa.me/96279000001')
    const decoded = decodeURIComponent(waBtn.href)
    expect(decoded).toContain('دوّار')
    expect(decoded).toContain('Augmentin')
  })

  it('shows distance when viewerLat/Lng provided', () => {
    render(<PostCard post={basePost} viewerLat={31.85} viewerLng={35.85} />)
    // Match a distance value: digits followed by كم or م (unit only)
    const distEl = screen.getByText(/^\d+(\.\d+)?\s*(كم|م)$/)
    expect(distEl).toBeInTheDocument()
  })

  it('calls onMessage when أريد هذا clicked', async () => {
    const onMessage = vi.fn()
    render(<PostCard post={basePost} onMessage={onMessage} />)
    await userEvent.click(screen.getByText('أريد هذا'))
    expect(onMessage).toHaveBeenCalledWith('p1')
  })

  it('renders voice player when voice media present', () => {
    const postWithVoice = {
      ...basePost,
      media: [{ type: 'voice', storage_url: 'https://cdn/voice.webm' }],
    }
    render(<PostCard post={postWithVoice} />)
    expect(screen.getByLabelText('تشغيل المقطع الصوتي')).toBeInTheDocument()
  })

  it('renders image when image media present', () => {
    const postWithImage = {
      ...basePost,
      media: [{ type: 'image', storage_url: 'https://cdn/img.jpg' }],
    }
    render(<PostCard post={postWithImage} />)
    expect(screen.getByAltText('صورة 1')).toBeInTheDocument()
  })
})
