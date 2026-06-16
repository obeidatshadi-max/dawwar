import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { compressImage, uploadMedia, haversineKm } from './mediaUtils'

// ── haversineKm ──────────────────────────────────────────────
describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineKm(31.9, 35.9, 31.9, 35.9)).toBe(0)
  })

  it('Amman to Zarqa is ~22 km', () => {
    const d = haversineKm(31.9539, 35.9106, 32.0728, 36.0878)
    expect(d).toBeGreaterThan(18)
    expect(d).toBeLessThan(26)
  })
})

// ── compressImage ─────────────────────────────────────────────
describe('compressImage', () => {
  beforeEach(() => {
    globalThis.Image = class {
      set src(v) { setTimeout(() => this.onload?.(), 0) }
    }
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:fake')
    globalThis.URL.revokeObjectURL = vi.fn()
    const mockBlob = new Blob(['img'], { type: 'image/jpeg' })
    const mockCtx = { drawImage: vi.fn() }
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockCtx),
      toBlob: vi.fn((cb) => cb(mockBlob)),
    }
    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas)
  })

  afterEach(() => { vi.restoreAllMocks() })

  it('returns a Blob', async () => {
    const file = new File(['x'], 'test.jpg', { type: 'image/jpeg' })
    const result = await compressImage(file)
    expect(result).toBeInstanceOf(Blob)
  })

  it('rejects when toBlob returns null', async () => {
    const mockCanvas = {
      width: 0, height: 0,
      getContext: vi.fn(() => ({ drawImage: vi.fn() })),
      toBlob: vi.fn((cb) => cb(null)),
    }
    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas)
    const file = new File(['x'], 'test.jpg', { type: 'image/jpeg' })
    await expect(compressImage(file)).rejects.toThrow('compression failed')
  })
})

// ── uploadMedia ───────────────────────────────────────────────
describe('uploadMedia', () => {
  it('returns public URL on success', async () => {
    const mockSupabase = {
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ error: null }),
          getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://cdn/file.jpg' } })),
        })),
      },
    }
    const blob = new Blob(['data'], { type: 'image/jpeg' })
    const url = await uploadMedia(mockSupabase, 'post-media', 'images/1/0', blob, 'image/jpeg')
    expect(url).toBe('https://cdn/file.jpg')
  })

  it('throws on storage error', async () => {
    const mockSupabase = {
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ error: new Error('quota exceeded') }),
          getPublicUrl: vi.fn(),
        })),
      },
    }
    const blob = new Blob(['data'])
    await expect(uploadMedia(mockSupabase, 'post-media', 'x', blob, 'image/jpeg'))
      .rejects.toThrow('quota exceeded')
  })
})
