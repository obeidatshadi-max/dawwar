# دوّار — Plan B: Core Features

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the live app: Feed screen with post cards, Create Post wizard (4 steps), image compression + voice recording, and Supabase data layer with real-time updates.

**Architecture:** Feed queries `posts` + `profiles` + `post_media` via Supabase JS, joined in a single select. Geographic distance calculated client-side (Haversine) — avoids a PostGIS RPC migration while staying accurate enough for city-scale filtering. Media compressed client-side (Canvas API for images, MediaRecorder for voice) before upload to Supabase Storage `post-media` bucket. Create Post wizard is a multi-step orchestrator that collects data across 4 steps then batch-publishes to one or more networks.

**Tech Stack:** React 18, Vite 5, Tailwind CSS v3, Zustand, React Router v6, @supabase/supabase-js v2, Vitest + React Testing Library

---

## Design Tokens (Tailwind class reference)

All brand colors must use these tokens — no hardcoded hex:
- `bg-brand-bg` `#0d1f1a` — page background
- `bg-brand-card` `#132d21` — card background
- `border-brand-border` `#14532d` — card borders
- `bg-brand-primary` / `text-brand-primary` `#059669` — primary accent
- `text-brand-text` `#f0fdf4` — primary text
- `text-brand-muted` `#86efac` — secondary text
- `text-brand-success` `#4ade80` — prices / success
- `text-brand-warning` `#fbbf24` — expiry warning
- `bg-brand-offer` — offer badge (red `#dc2626`)
- `bg-brand-wanted` — wanted badge (purple `#7c3aed`)
- `bg-brand-whatsapp` `#25d366` — WhatsApp button
- `text-brand-error` `#f87171` — errors

---

## File Map

```
src/
├── lib/
│   └── mediaUtils.js          (compressImage, uploadMedia)
├── hooks/
│   ├── useVoiceRecorder.js    (MediaRecorder state machine)
│   ├── useFeed.js             (posts query + client-side filters)
│   └── useNetworks.js         (user's network memberships)
├── components/
│   ├── PostCard.jsx           (full post card with media)
│   └── VoicePlayer.jsx        (custom HTML5 audio player)
└── pages/
    ├── Feed/
    │   ├── Feed.jsx           (network selector, filter bar, FAB, list)
    │   └── FilterBar.jsx      (الكل/عروض/مطلوب + radius + sort)
    └── CreatePost/
        ├── CreatePost.jsx     (orchestrator, progress, publish)
        ├── Step1Product.jsx   (type toggle, name, qty, unit, expiry)
        ├── Step2Price.jsx     (price/currency/discount OR wanted note)
        ├── Step3Media.jsx     (images + voice + description)
        └── Step4Review.jsx    (preview + network select + publish)
```

---

## Task 8: Media Utilities

**Files:**
- Create: `src/lib/mediaUtils.js`
- Test: `src/lib/mediaUtils.test.js`

### `src/lib/mediaUtils.js`

```js
export async function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('compression failed'))
          resolve(blob)
        },
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')) }
    img.src = url
  })
}

export async function uploadMedia(supabase, bucket, path, blob, mimeType) {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: mimeType, upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
```

- [ ] **Step 1: Write failing tests**

Create `src/lib/mediaUtils.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
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
    // Mock Image
    globalThis.Image = class {
      set src(v) { setTimeout(() => this.onload?.(), 0) }
    }
    // Mock URL
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:fake')
    globalThis.URL.revokeObjectURL = vi.fn()
    // Mock Canvas
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
```

Run: `npx vitest run src/lib/mediaUtils.test.js`
Expected: FAIL — `mediaUtils.js` not created yet

- [ ] **Step 2: Create `src/lib/mediaUtils.js`** with code shown above

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/lib/mediaUtils.test.js`
Expected: 6/6 PASS

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: 35/35 pass (29 existing + 6 new)

- [ ] **Step 5: Commit**

```bash
git add src/lib/mediaUtils.js src/lib/mediaUtils.test.js
git commit -m "feat: add media utilities (compressImage, uploadMedia, haversineKm)"
```

---

## Task 9: useVoiceRecorder Hook

**Files:**
- Create: `src/hooks/useVoiceRecorder.js`
- Test: `src/hooks/useVoiceRecorder.test.js`

### `src/hooks/useVoiceRecorder.js`

```js
import { useState, useRef, useEffect } from 'react'

const MAX_MS = 60_000

export function useVoiceRecorder() {
  const [status, setStatus] = useState('idle') // 'idle' | 'recording' | 'recorded'
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState('')

  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const startTimeRef = useRef(null)

  useEffect(() => () => {
    clearTimeout(timerRef.current)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
  }, [audioUrl])

  async function startRecording() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'
      const recorder = new MediaRecorder(stream, { mimeType })
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(blob)
        const secs = Math.round((Date.now() - startTimeRef.current) / 1000)
        setAudioBlob(blob)
        setAudioUrl(url)
        setDuration(secs)
        setStatus('recorded')
      }

      recorder.start(250)
      startTimeRef.current = Date.now()
      setStatus('recording')
      timerRef.current = setTimeout(() => stopRecording(), MAX_MS)
    } catch (err) {
      setError(err?.message ?? 'تعذّر الوصول إلى الميكروفون')
    }
  }

  function stopRecording() {
    clearTimeout(timerRef.current)
    recorderRef.current?.stop()
  }

  function clearRecording() {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioBlob(null)
    setAudioUrl(null)
    setDuration(0)
    setStatus('idle')
    setError('')
  }

  return { status, audioBlob, audioUrl, duration, error, startRecording, stopRecording, clearRecording }
}
```

- [ ] **Step 1: Write failing tests**

Create `src/hooks/useVoiceRecorder.test.js`:

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVoiceRecorder } from './useVoiceRecorder'

function makeMockRecorder(onStop) {
  const recorder = {
    start: vi.fn(),
    stop: vi.fn(() => recorder.onstop?.()),
    ondataavailable: null,
    onstop: null,
    state: 'inactive',
  }
  return recorder
}

function setupMediaMocks(recorderInstance) {
  const mockStream = { getTracks: vi.fn(() => [{ stop: vi.fn() }]) }
  vi.stubGlobal('navigator', {
    mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
  })
  vi.stubGlobal('MediaRecorder', Object.assign(
    vi.fn(() => recorderInstance),
    { isTypeSupported: vi.fn(() => true) }
  ))
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:fake-audio'),
    revokeObjectURL: vi.fn(),
  })
}

describe('useVoiceRecorder', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('initial state is idle', () => {
    const { result } = renderHook(() => useVoiceRecorder())
    expect(result.current.status).toBe('idle')
    expect(result.current.audioBlob).toBeNull()
  })

  it('startRecording sets status to recording', async () => {
    const rec = makeMockRecorder()
    setupMediaMocks(rec)
    const { result } = renderHook(() => useVoiceRecorder())
    await act(async () => { await result.current.startRecording() })
    expect(result.current.status).toBe('recording')
    expect(rec.start).toHaveBeenCalledWith(250)
  })

  it('stopRecording transitions to recorded with blob', async () => {
    const rec = makeMockRecorder()
    setupMediaMocks(rec)
    // Simulate ondataavailable providing a chunk when stop is called
    rec.stop = vi.fn(() => {
      rec.ondataavailable?.({ data: new Blob(['audio'], { type: 'audio/webm' }) })
      rec.onstop?.()
    })
    const { result } = renderHook(() => useVoiceRecorder())
    await act(async () => { await result.current.startRecording() })
    await act(async () => { result.current.stopRecording() })
    expect(result.current.status).toBe('recorded')
    expect(result.current.audioBlob).toBeInstanceOf(Blob)
    expect(result.current.audioUrl).toBe('blob:fake-audio')
  })

  it('clearRecording resets to idle', async () => {
    const rec = makeMockRecorder()
    setupMediaMocks(rec)
    rec.stop = vi.fn(() => {
      rec.ondataavailable?.({ data: new Blob(['x']) })
      rec.onstop?.()
    })
    const { result } = renderHook(() => useVoiceRecorder())
    await act(async () => { await result.current.startRecording() })
    await act(async () => { result.current.stopRecording() })
    act(() => { result.current.clearRecording() })
    expect(result.current.status).toBe('idle')
    expect(result.current.audioBlob).toBeNull()
  })

  it('getUserMedia failure sets error', async () => {
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockRejectedValue(new Error('Permission denied')),
      },
    })
    vi.stubGlobal('MediaRecorder', Object.assign(vi.fn(), { isTypeSupported: vi.fn() }))
    const { result } = renderHook(() => useVoiceRecorder())
    await act(async () => { await result.current.startRecording() })
    expect(result.current.error).toBe('Permission denied')
    expect(result.current.status).toBe('idle')
  })
})
```

Run: `npx vitest run src/hooks/useVoiceRecorder.test.js`
Expected: FAIL — file not created

- [ ] **Step 2: Create `src/hooks/useVoiceRecorder.js`** with code shown above

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/hooks/useVoiceRecorder.test.js`
Expected: 5/5 PASS

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: 40/40 pass

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useVoiceRecorder.js src/hooks/useVoiceRecorder.test.js
git commit -m "feat: add useVoiceRecorder hook with 60s auto-stop"
```

---

## Task 10: PostCard + VoicePlayer Components

**Files:**
- Create: `src/components/VoicePlayer.jsx`
- Create: `src/components/PostCard.jsx`
- Test: `src/components/PostCard.test.jsx`

### `src/components/VoicePlayer.jsx`

```jsx
import { useRef, useState } from 'react'

export default function VoicePlayer({ url }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play(); setPlaying(true) }
  }

  function onTimeUpdate() {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    setProgress(audio.currentTime / audio.duration)
  }

  function onLoadedMetadata() {
    setDuration(Math.round(audioRef.current?.duration ?? 0))
  }

  function onEnded() {
    setPlaying(false)
    setProgress(0)
  }

  function formatTime(secs) {
    const m = Math.floor(secs / 60)
    const s = String(secs % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div className="flex items-center gap-3 bg-brand-card rounded-xl px-3 py-2 border border-brand-border">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        aria-label="تشغيل المقطع الصوتي"
      />
      <button
        onClick={toggle}
        className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center flex-shrink-0"
        aria-label={playing ? 'إيقاف' : 'تشغيل'}
      >
        {playing ? (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
          </svg>
        ) : (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </button>
      <div className="flex-1">
        <div className="w-full bg-brand-border rounded-full h-1">
          <div
            className="bg-brand-primary h-1 rounded-full transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
      <span className="text-brand-muted text-xs tabular-nums">{formatTime(duration)}</span>
    </div>
  )
}
```

### `src/components/PostCard.jsx`

```jsx
import VoicePlayer from './VoicePlayer'
import { haversineKm } from '../lib/mediaUtils'

function discountPct(price, original) {
  if (!original || !price || original <= price) return null
  return Math.round((1 - price / original) * 100)
}

function isExpiryWarning(dateStr) {
  if (!dateStr) return false
  const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff < 90
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('ar-JO', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} م`
  return `${km.toFixed(1)} كم`
}

export default function PostCard({ post, viewerLat, viewerLng, onMessage, onDetail }) {
  const { type, product_name, quantity, unit, price, original_price, currency,
    expiry_date, phone, author, media = [] } = post

  const images = media.filter((m) => m.type === 'image')
  const voice = media.find((m) => m.type === 'voice')

  const dist = (viewerLat && viewerLng && author?.lat && author?.lng)
    ? haversineKm(viewerLat, viewerLng, author.lat, author.lng)
    : null

  const pct = discountPct(price, original_price)
  const expiryWarn = isExpiryWarning(expiry_date)

  const waText = encodeURIComponent(`مرحباً، رأيت منشورك على دوّار عن ${product_name}`)
  const waLink = `https://wa.me/${phone?.replace(/\D/g, '')}?text=${waText}`

  return (
    <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${
            type === 'offer' ? 'bg-brand-offer' : 'bg-brand-wanted'
          }`}>
            {type === 'offer' ? 'قرب انتهاء' : 'مطلوب'}
          </span>
          {dist !== null && (
            <span className="text-xs text-brand-muted bg-brand-bg px-2 py-0.5 rounded-full">
              {formatDistance(dist)}
            </span>
          )}
        </div>
        <span className="text-xs text-brand-muted">{author?.pharmacy_name} — {author?.city}</span>
      </div>

      {/* Product info */}
      <div className="px-4 pb-3">
        <h3 className="text-brand-text font-semibold text-base" dir="ltr">{product_name}</h3>
        <p className="text-brand-muted text-sm">{quantity} {unit}</p>

        {type === 'offer' && price && (
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-brand-success font-bold">{price} {currency}</span>
            {original_price && (
              <span className="text-brand-muted text-xs line-through">{original_price} {currency}</span>
            )}
            {pct && <span className="text-brand-offer text-xs font-bold">-{pct}%</span>}
          </div>
        )}

        {expiry_date && (
          <p className={`text-xs mt-1 ${expiryWarn ? 'text-brand-warning' : 'text-brand-muted'}`}>
            {expiryWarn && '⚠ '}انتهاء: {formatDate(expiry_date)}
          </p>
        )}
      </div>

      {/* Image gallery */}
      {images.length > 0 && (
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto snap-x scrollbar-none">
          {images.map((img, i) => (
            <img
              key={i}
              src={img.storage_url}
              alt={`صورة ${i + 1}`}
              className="h-32 w-auto rounded-xl object-cover snap-start flex-shrink-0"
            />
          ))}
        </div>
      )}

      {/* Voice note */}
      {voice && (
        <div className="px-4 pb-3">
          <VoicePlayer url={voice.storage_url} />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 px-4 pb-4 pt-1 border-t border-brand-border mt-1">
        <button
          onClick={() => onMessage?.(post.id)}
          className="flex-1 py-2 rounded-xl bg-brand-primary text-white text-sm font-medium"
        >
          أريد هذا
        </button>
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2 rounded-xl bg-brand-whatsapp text-white text-sm font-medium text-center"
        >
          واتساب
        </a>
        <button
          onClick={() => onDetail?.(post.id)}
          className="px-4 py-2 rounded-xl border border-brand-border text-brand-muted text-sm"
        >
          تفاصيل
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 1: Write failing tests**

Create `src/components/PostCard.test.jsx`:

```jsx
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
  expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // 30 days from now
  phone: '+96279000001',
  author: { pharmacy_name: 'صيدلية النور', city: 'عمّان', lat: 31.9, lng: 35.9 },
  media: [],
}

describe('PostCard', () => {
  it('shows offer badge for type=offer', () => {
    render(<PostCard post={basePost} />)
    expect(screen.getByText('قرب انتهاء')).toBeInTheDocument()
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

  it('shows expiry warning with amber styling when < 90 days', () => {
    const { container } = render(<PostCard post={basePost} />)
    // 30 days from now — should show warning
    const expiryEl = container.querySelector('.text-brand-warning')
    expect(expiryEl).not.toBeNull()
    expect(expiryEl.textContent).toContain('انتهاء')
  })

  it('WhatsApp link has correct wa.me URL with pre-filled message', () => {
    render(<PostCard post={basePost} />)
    const waBtn = screen.getByText('واتساب').closest('a')
    expect(waBtn.href).toContain('wa.me/96279000001')
    expect(waBtn.href).toContain('دوّار')
    expect(waBtn.href).toContain('Augmentin')
  })

  it('shows distance when viewerLat/Lng provided', () => {
    render(<PostCard post={basePost} viewerLat={31.85} viewerLng={35.85} />)
    const distEl = screen.getByText(/كم|م/)
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
```

Run: `npx vitest run src/components/PostCard.test.jsx`
Expected: FAIL — files not created

- [ ] **Step 2: Create `src/components/VoicePlayer.jsx`** with code shown above

- [ ] **Step 3: Create `src/components/PostCard.jsx`** with code shown above

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/components/PostCard.test.jsx`
Expected: 10/10 PASS

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: 50/50 pass

- [ ] **Step 6: Commit**

```bash
git add src/components/PostCard.jsx src/components/VoicePlayer.jsx src/components/PostCard.test.jsx
git commit -m "feat: add PostCard and VoicePlayer components"
```

---

## Task 11: Feed Data Hooks + Feed Screen

**Files:**
- Create: `src/hooks/useFeed.js`
- Create: `src/hooks/useNetworks.js`
- Create: `src/pages/Feed/FilterBar.jsx`
- Create: `src/pages/Feed/Feed.jsx`
- Modify: `src/App.jsx` — replace /feed stub with `<Feed />`

### `src/hooks/useNetworks.js`

```js
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export function useNetworks() {
  const { session } = useAuthStore()
  const [networks, setNetworks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return
    let cancelled = false
    async function fetch() {
      const { data } = await supabase
        .from('network_members')
        .select('network_id, role, networks(id, name, city, country)')
        .eq('profile_id', session.user.id)
        .eq('status', 'active')
      if (!cancelled) {
        setNetworks(data?.map((m) => ({ ...m.networks, role: m.role })) ?? [])
        setLoading(false)
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [session])

  return { networks, loading }
}
```

### `src/hooks/useFeed.js`

```js
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { haversineKm } from '../lib/mediaUtils'

export function useFeed({ networkId, filter = 'all', search = '', sortBy = 'newest', viewerLat, viewerLng, radiusKm = null }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchPosts = useCallback(async () => {
    if (!networkId) return
    setLoading(true)
    setError('')
    try {
      let query = supabase
        .from('posts')
        .select('*, author:profiles(id, pharmacy_name, city, lat, lng, phone), media:post_media(type, storage_url)')
        .eq('network_id', networkId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (filter !== 'all') query = query.eq('type', filter)
      if (search.trim()) query = query.ilike('product_name', `%${search.trim()}%`)

      const { data, error: fetchErr } = await query
      if (fetchErr) throw fetchErr

      let result = data ?? []

      // Client-side radius filter + distance annotation
      if (viewerLat && viewerLng) {
        result = result.map((p) => ({
          ...p,
          _distKm: (p.author?.lat && p.author?.lng)
            ? haversineKm(viewerLat, viewerLng, p.author.lat, p.author.lng)
            : null,
        }))
        if (radiusKm) {
          result = result.filter((p) => p._distKm === null || p._distKm <= radiusKm)
        }
        if (sortBy === 'nearest') {
          result = [...result].sort((a, b) => (a._distKm ?? Infinity) - (b._distKm ?? Infinity))
        }
      }

      setPosts(result)
    } catch (err) {
      setError(err?.message ?? 'خطأ في تحميل المنشورات')
    } finally {
      setLoading(false)
    }
  }, [networkId, filter, search, sortBy, viewerLat, viewerLng, radiusKm])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  // Realtime subscription
  useEffect(() => {
    if (!networkId) return
    const channel = supabase
      .channel(`feed-${networkId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'posts',
        filter: `network_id=eq.${networkId}`,
      }, () => fetchPosts())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [networkId, fetchPosts])

  return { posts, loading, error, refetch: fetchPosts }
}
```

### `src/pages/Feed/FilterBar.jsx`

```jsx
const RADIUS_OPTIONS = [
  { label: 'المدينة كلها', value: null },
  { label: '٢ كم', value: 2 },
  { label: '٥ كم', value: 5 },
  { label: '١٠ كم', value: 10 },
]

export default function FilterBar({ filter, onFilter, sortBy, onSort, radiusKm, onRadius }) {
  return (
    <div className="flex flex-col gap-2">
      {/* Type filter tabs */}
      <div className="flex gap-1 bg-brand-card rounded-xl p-1">
        {[['all', 'الكل'], ['offer', 'عروض'], ['wanted', 'مطلوب']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => onFilter(val)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === val
                ? 'bg-brand-primary text-white'
                : 'text-brand-muted hover:text-brand-text'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sort + Radius row */}
      <div className="flex gap-2">
        <button
          onClick={() => onSort(sortBy === 'newest' ? 'nearest' : 'newest')}
          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border border-brand-border text-brand-muted text-xs"
        >
          {sortBy === 'newest' ? 'الأحدث' : 'الأقرب'}
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>

        <select
          value={radiusKm ?? ''}
          onChange={(e) => onRadius(e.target.value === '' ? null : Number(e.target.value))}
          className="flex-1 bg-brand-card border border-brand-border rounded-xl text-brand-muted text-xs px-3 py-2 text-right appearance-none"
        >
          {RADIUS_OPTIONS.map((o) => (
            <option key={String(o.value)} value={o.value ?? ''}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
```

### `src/pages/Feed/Feed.jsx`

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useNetworks } from '../../hooks/useNetworks'
import { useFeed } from '../../hooks/useFeed'
import PostCard from '../../components/PostCard'
import FilterBar from './FilterBar'

export default function Feed() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const { networks, loading: networksLoading } = useNetworks()

  const [selectedNetworkId, setSelectedNetworkId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [radiusKm, setRadiusKm] = useState(null)
  const [search, setSearch] = useState('')

  const networkId = selectedNetworkId ?? networks[0]?.id ?? null

  const { posts, loading: postsLoading, error } = useFeed({
    networkId,
    filter,
    search,
    sortBy,
    viewerLat: profile?.lat,
    viewerLng: profile?.lng,
    radiusKm,
  })

  if (networksLoading) return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (networks.length === 0) return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-6 text-center">
      <p className="text-brand-text text-lg font-semibold mb-2">لا توجد شبكات بعد</p>
      <p className="text-brand-muted text-sm">انضم إلى شبكة أو أنشئ واحدة من تبويب شبكاتي</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Network selector */}
      {networks.length > 1 && (
        <div className="flex gap-2 px-4 pt-4 pb-2 overflow-x-auto scrollbar-none">
          {networks.map((n) => (
            <button
              key={n.id}
              onClick={() => setSelectedNetworkId(n.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                n.id === networkId
                  ? 'bg-brand-primary text-white'
                  : 'bg-brand-card border border-brand-border text-brand-muted'
              }`}
            >
              {n.name}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن منتج... (مثال: Augmentin)"
          className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-2.5 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-primary"
          dir="auto"
        />
      </div>

      {/* Filter bar */}
      <div className="px-4 pb-3">
        <FilterBar
          filter={filter} onFilter={setFilter}
          sortBy={sortBy} onSort={setSortBy}
          radiusKm={radiusKm} onRadius={setRadiusKm}
        />
      </div>

      {/* Posts list */}
      <div className="px-4 pb-24 flex flex-col gap-4">
        {error && <p className="text-brand-error text-sm text-center">{error}</p>}

        {postsLoading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!postsLoading && posts.length === 0 && !error && (
          <p className="text-brand-muted text-center py-8">لا توجد منشورات</p>
        )}

        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            viewerLat={profile?.lat}
            viewerLng={profile?.lng}
            onMessage={(id) => navigate(`/messages/${id}`)}
            onDetail={(id) => navigate(`/posts/${id}`)}
          />
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/create')}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 w-14 h-14 bg-brand-primary rounded-full shadow-lg flex items-center justify-center z-10"
        aria-label="إنشاء منشور"
      >
        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  )
}
```

- [ ] **Step 1: Write failing tests for useFeed**

Create `src/hooks/useFeed.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useFeed } from './useFeed'

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}))

vi.mock('../lib/mediaUtils', () => ({
  haversineKm: vi.fn((lat1, lng1, lat2, lng2) => {
    // Simple mock: return fixed distance based on lat difference
    return Math.abs(lat2 - lat1) * 111
  }),
}))

import { supabase } from '../lib/supabase'

function makeQueryMock(data, error = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error }),
  }
  supabase.from.mockReturnValue(chain)
  return chain
}

const NETWORK_ID = 'net-1'

const mockPosts = [
  {
    id: 'p1', type: 'offer', product_name: 'Augmentin', status: 'active',
    created_at: '2026-06-16T10:00:00Z', network_id: NETWORK_ID,
    author: { id: 'u1', pharmacy_name: 'صيدلية أ', lat: 31.9, lng: 35.9 },
    media: [],
  },
  {
    id: 'p2', type: 'wanted', product_name: 'Metformin', status: 'active',
    created_at: '2026-06-15T10:00:00Z', network_id: NETWORK_ID,
    author: { id: 'u2', pharmacy_name: 'صيدلية ب', lat: 32.0, lng: 36.0 },
    media: [],
  },
]

describe('useFeed', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('fetches and returns posts', async () => {
    makeQueryMock(mockPosts)
    const { result } = renderHook(() => useFeed({ networkId: NETWORK_ID }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.posts).toHaveLength(2)
  })

  it('filters by type=offer', async () => {
    const chain = makeQueryMock(mockPosts)
    renderHook(() => useFeed({ networkId: NETWORK_ID, filter: 'offer' }))
    await waitFor(() => {})
    expect(chain.eq).toHaveBeenCalledWith('type', 'offer')
  })

  it('filters by search term', async () => {
    const chain = makeQueryMock([mockPosts[0]])
    renderHook(() => useFeed({ networkId: NETWORK_ID, search: 'Augmentin' }))
    await waitFor(() => {})
    expect(chain.ilike).toHaveBeenCalledWith('product_name', '%Augmentin%')
  })

  it('annotates posts with distance when viewer coords provided', async () => {
    makeQueryMock(mockPosts)
    const { result } = renderHook(() =>
      useFeed({ networkId: NETWORK_ID, viewerLat: 31.9, viewerLng: 35.9 })
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.posts[0]._distKm).toBeDefined()
  })

  it('sorts by nearest when sortBy=nearest', async () => {
    // p2 is farther (lat 32.0 vs 31.9, viewer at 31.9) → should come second
    makeQueryMock(mockPosts)
    const { result } = renderHook(() =>
      useFeed({ networkId: NETWORK_ID, sortBy: 'nearest', viewerLat: 31.9, viewerLng: 35.9 })
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.posts[0].id).toBe('p1') // nearer
    expect(result.current.posts[1].id).toBe('p2') // farther
  })

  it('sets error on fetch failure', async () => {
    makeQueryMock(null, new Error('RLS error'))
    const { result } = renderHook(() => useFeed({ networkId: NETWORK_ID }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toContain('RLS error')
  })
})
```

Run: `npx vitest run src/hooks/useFeed.test.js`
Expected: FAIL — files not created

- [ ] **Step 2: Create `src/hooks/useNetworks.js`** with code shown above

- [ ] **Step 3: Create `src/hooks/useFeed.js`** with code shown above

- [ ] **Step 4: Create `src/pages/Feed/FilterBar.jsx`** with code shown above

- [ ] **Step 5: Create `src/pages/Feed/Feed.jsx`** with code shown above

- [ ] **Step 6: Update `src/App.jsx`** — replace feed stub with Feed import:

```jsx
// Add import at top:
import Feed from './pages/Feed/Feed'

// Replace /feed route:
<Route path="/feed" element={
  <PrivateRoute><Feed /></PrivateRoute>
} />
```

- [ ] **Step 7: Run feed tests**

Run: `npx vitest run src/hooks/useFeed.test.js`
Expected: 6/6 PASS

- [ ] **Step 8: Run all tests**

Run: `npx vitest run`
Expected: 56/56 pass

- [ ] **Step 9: Commit**

```bash
git add src/hooks/useFeed.js src/hooks/useNetworks.js src/pages/Feed/ src/App.jsx
git commit -m "feat: add Feed screen with post cards, filters, and realtime updates"
```

---

## Task 12: Create Post Wizard

**Files:**
- Create: `src/pages/CreatePost/Step1Product.jsx`
- Create: `src/pages/CreatePost/Step2Price.jsx`
- Create: `src/pages/CreatePost/Step3Media.jsx`
- Create: `src/pages/CreatePost/Step4Review.jsx`
- Create: `src/pages/CreatePost/CreatePost.jsx`
- Test: `src/pages/CreatePost/CreatePost.test.jsx`
- Modify: `src/App.jsx` — add `/create` route

### `src/pages/CreatePost/Step1Product.jsx`

```jsx
import { useState } from 'react'

const UNITS = ['علبة', 'شريط', 'أمبول', 'كيس', 'قطعة', 'أخرى']

export default function Step1Product({ onNext, initialData = {} }) {
  const [type, setType] = useState(initialData.type ?? 'offer')
  const [productName, setProductName] = useState(initialData.product_name ?? '')
  const [quantity, setQuantity] = useState(initialData.quantity ?? '')
  const [unit, setUnit] = useState(initialData.unit ?? 'علبة')
  const [expiryDate, setExpiryDate] = useState(initialData.expiry_date ?? '')
  const [error, setError] = useState('')

  function validate() {
    if (!productName.trim()) return 'اسم المنتج مطلوب'
    if (!quantity || Number(quantity) <= 0) return 'الكمية مطلوبة'
    if (type === 'offer' && !expiryDate) return 'تاريخ الانتهاء مطلوب للعروض'
    return ''
  }

  function handleNext() {
    const err = validate()
    if (err) { setError(err); return }
    onNext({ type, product_name: productName.trim(), quantity: Number(quantity), unit, expiry_date: expiryDate || null })
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-brand-text text-xl font-bold">المنتج</h2>

      {/* Type toggle */}
      <div className="flex gap-2 bg-brand-card rounded-xl p-1">
        {[['offer', 'عرض'], ['wanted', 'مطلوب']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setType(val)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              type === val ? 'bg-brand-primary text-white' : 'text-brand-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Product name — English */}
      <div>
        <label className="text-brand-muted text-sm mb-1 block">اسم المنتج (بالإنجليزية)</label>
        <input
          type="text"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder="مثال: Augmentin 625mg"
          dir="ltr"
          className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text placeholder:text-brand-muted outline-none focus:border-brand-primary"
        />
      </div>

      {/* Quantity + Unit */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-brand-muted text-sm mb-1 block">الكمية</label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:border-brand-primary"
          />
        </div>
        <div className="flex-1">
          <label className="text-brand-muted text-sm mb-1 block">الوحدة</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:border-brand-primary appearance-none"
          >
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {/* Expiry date (offers only) */}
      {type === 'offer' && (
        <div>
          <label className="text-brand-muted text-sm mb-1 block">تاريخ انتهاء الصلاحية</label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:border-brand-primary"
          />
        </div>
      )}

      {error && <p className="text-brand-error text-sm">{error}</p>}

      <button
        onClick={handleNext}
        className="w-full py-3 bg-brand-primary text-white rounded-xl font-semibold"
      >
        التالي
      </button>
    </div>
  )
}
```

### `src/pages/CreatePost/Step2Price.jsx`

```jsx
import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'

export default function Step2Price({ type, onNext, onBack, initialData = {} }) {
  const { profile } = useAuthStore()
  const defaultCurrency = profile?.country === 'IQ' ? 'IQD' : 'JOD'

  const [originalPrice, setOriginalPrice] = useState(initialData.original_price ?? '')
  const [price, setPrice] = useState(initialData.price ?? '')
  const [currency, setCurrency] = useState(initialData.currency ?? defaultCurrency)
  const [phone, setPhone] = useState(initialData.phone ?? profile?.phone ?? '')
  const [urgencyNote, setUrgencyNote] = useState(initialData.urgency_note ?? '')
  const [error, setError] = useState('')

  const discount = (type === 'offer' && originalPrice && price && Number(originalPrice) > Number(price))
    ? Math.round((1 - Number(price) / Number(originalPrice)) * 100)
    : null

  function handleNext() {
    if (!phone.trim()) { setError('رقم الواتساب مطلوب'); return }
    if (type === 'offer') {
      if (!price || Number(price) <= 0) { setError('السعر مطلوب'); return }
    }
    onNext({
      price: price ? Number(price) : null,
      original_price: originalPrice ? Number(originalPrice) : null,
      currency,
      phone: phone.trim(),
      urgency_note: urgencyNote.trim() || null,
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-brand-text text-xl font-bold">
        {type === 'offer' ? 'السعر' : 'معلومات التواصل'}
      </h2>

      {type === 'offer' && (
        <>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-brand-muted text-sm mb-1 block">السعر الأصلي</label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:border-brand-primary"
              />
            </div>
            <div className="flex-1">
              <label className="text-brand-muted text-sm mb-1 block">سعر البيع</label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <div className="flex gap-3 items-center">
            <div className="flex-1">
              <label className="text-brand-muted text-sm mb-1 block">العملة</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:border-brand-primary"
              >
                <option value="JOD">دينار أردني (JOD)</option>
                <option value="IQD">دينار عراقي (IQD)</option>
              </select>
            </div>
            {discount !== null && (
              <div className="text-center">
                <span className="text-brand-offer text-2xl font-bold">-{discount}%</span>
                <p className="text-brand-muted text-xs">خصم</p>
              </div>
            )}
          </div>
        </>
      )}

      {type === 'wanted' && (
        <div>
          <label className="text-brand-muted text-sm mb-1 block">ملاحظة الإلحاحية (اختياري)</label>
          <input
            type="text"
            value={urgencyNote}
            onChange={(e) => setUrgencyNote(e.target.value)}
            placeholder="مثال: عاجل — محتاج هذا الأسبوع"
            className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text placeholder:text-brand-muted outline-none focus:border-brand-primary"
          />
        </div>
      )}

      <div>
        <label className="text-brand-muted text-sm mb-1 block">رقم الواتساب</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          dir="ltr"
          className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text placeholder:text-brand-muted outline-none focus:border-brand-primary"
        />
      </div>

      {error && <p className="text-brand-error text-sm">{error}</p>}

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-3 border border-brand-border text-brand-muted rounded-xl">
          رجوع
        </button>
        <button onClick={handleNext} className="flex-1 py-3 bg-brand-primary text-white rounded-xl font-semibold">
          التالي
        </button>
      </div>
    </div>
  )
}
```

### `src/pages/CreatePost/Step3Media.jsx`

```jsx
import { useRef, useState } from 'react'
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder'
import VoicePlayer from '../../components/VoicePlayer'

const MAX_IMAGES = 5

export default function Step3Media({ onNext, onBack, initialData = {} }) {
  const [images, setImages] = useState(initialData.images ?? []) // array of File
  const [description, setDescription] = useState(initialData.description ?? '')
  const fileInputRef = useRef(null)
  const { status, audioBlob, audioUrl, duration, error: recError, startRecording, stopRecording, clearRecording } = useVoiceRecorder()

  function handleFileChange(e) {
    const files = Array.from(e.target.files ?? [])
    setImages((prev) => [...prev, ...files].slice(0, MAX_IMAGES))
    e.target.value = ''
  }

  function removeImage(i) {
    setImages((prev) => prev.filter((_, idx) => idx !== i))
  }

  function handleNext() {
    onNext({
      images,
      audioBlob: audioBlob ?? null,
      description: description.trim() || null,
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-brand-text text-xl font-bold">الصور والصوت</h2>

      {/* Image picker */}
      <div>
        <label className="text-brand-muted text-sm mb-2 block">
          الصور ({images.length}/{MAX_IMAGES})
        </label>
        <div className="flex flex-wrap gap-2">
          {images.map((file, i) => (
            <div key={i} className="relative w-20 h-20">
              <img
                src={URL.createObjectURL(file)}
                alt={`صورة ${i + 1}`}
                className="w-20 h-20 rounded-xl object-cover"
              />
              <button
                onClick={() => removeImage(i)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-brand-offer rounded-full text-white text-xs flex items-center justify-center"
                aria-label="حذف الصورة"
              >×</button>
            </div>
          ))}
          {images.length < MAX_IMAGES && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-brand-border flex items-center justify-center text-brand-muted text-2xl"
              aria-label="إضافة صورة"
            >+</button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
          aria-label="رفع صورة"
        />
      </div>

      {/* Voice recorder */}
      <div>
        <label className="text-brand-muted text-sm mb-2 block">ملاحظة صوتية (اختياري — حتى ٦٠ ث)</label>
        {status === 'idle' && (
          <button
            onClick={startRecording}
            className="w-full py-3 border border-brand-border rounded-xl text-brand-muted flex items-center justify-center gap-2"
          >
            <span className="w-3 h-3 rounded-full bg-brand-offer" />
            تسجيل ملاحظة صوتية
          </button>
        )}
        {status === 'recording' && (
          <button
            onClick={stopRecording}
            className="w-full py-3 border border-brand-offer rounded-xl text-brand-offer flex items-center justify-center gap-2 animate-pulse"
          >
            <span className="w-3 h-3 rounded-full bg-brand-offer" />
            إيقاف التسجيل
          </button>
        )}
        {status === 'recorded' && audioUrl && (
          <div className="flex flex-col gap-2">
            <VoicePlayer url={audioUrl} />
            <button onClick={clearRecording} className="text-brand-muted text-xs text-center">
              حذف التسجيل
            </button>
          </div>
        )}
        {recError && <p className="text-brand-error text-sm mt-1">{recError}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="text-brand-muted text-sm mb-1 block">وصف إضافي (اختياري)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="أي تفاصيل إضافية..."
          className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text placeholder:text-brand-muted outline-none focus:border-brand-primary resize-none"
        />
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-3 border border-brand-border text-brand-muted rounded-xl">
          رجوع
        </button>
        <button onClick={handleNext} className="flex-1 py-3 bg-brand-primary text-white rounded-xl font-semibold">
          التالي
        </button>
      </div>
    </div>
  )
}
```

### `src/pages/CreatePost/Step4Review.jsx`

```jsx
import { useState } from 'react'
import PostCard from '../../components/PostCard'
import { useAuthStore } from '../../store/authStore'
import { useNetworks } from '../../hooks/useNetworks'
import { supabase } from '../../lib/supabase'
import { compressImage, uploadMedia } from '../../lib/mediaUtils'

export default function Step4Review({ data, onBack, onDone }) {
  const { session, profile } = useAuthStore()
  const { networks } = useNetworks()
  const [selectedNetworks, setSelectedNetworks] = useState(networks.map((n) => n.id))
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')

  function toggleNetwork(id) {
    setSelectedNetworks((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  // Build a preview post object (local blob URLs for media preview)
  const previewImageUrls = (data.images ?? []).map((f) => URL.createObjectURL(f))
  const previewPost = {
    id: 'preview',
    type: data.type,
    product_name: data.product_name,
    quantity: data.quantity,
    unit: data.unit,
    price: data.price ?? null,
    original_price: data.original_price ?? null,
    currency: data.currency ?? profile?.country === 'IQ' ? 'IQD' : 'JOD',
    expiry_date: data.expiry_date ?? null,
    phone: data.phone ?? profile?.phone,
    author: { pharmacy_name: profile?.pharmacy_name, city: profile?.city, lat: profile?.lat, lng: profile?.lng },
    media: [
      ...previewImageUrls.map((url) => ({ type: 'image', storage_url: url })),
      ...(data.audioBlob ? [{ type: 'voice', storage_url: URL.createObjectURL(data.audioBlob) }] : []),
    ],
  }

  async function publish() {
    if (selectedNetworks.length === 0) { setError('اختر شبكة واحدة على الأقل'); return }
    if (publishing) return
    setPublishing(true)
    setError('')
    try {
      for (const networkId of selectedNetworks) {
        // Insert post
        const { data: post, error: postErr } = await supabase
          .from('posts')
          .insert({
            network_id: networkId,
            author_id: session.user.id,
            type: data.type,
            product_name: data.product_name,
            quantity: data.quantity,
            unit: data.unit,
            price: data.price,
            original_price: data.original_price,
            currency: data.currency,
            expiry_date: data.expiry_date,
            description: data.description,
            phone: data.phone ?? profile?.phone,
            status: 'active',
          })
          .select('id')
          .single()
        if (postErr) throw postErr

        const postId = post.id

        // Upload images
        for (let i = 0; i < (data.images ?? []).length; i++) {
          const blob = await compressImage(data.images[i])
          const url = await uploadMedia(supabase, 'post-media', `images/${postId}/${i}.jpg`, blob, 'image/jpeg')
          await supabase.from('post_media').insert({ post_id: postId, type: 'image', storage_url: url })
        }

        // Upload voice note
        if (data.audioBlob) {
          const url = await uploadMedia(supabase, 'post-media', `voice/${postId}/note.webm`, data.audioBlob, 'audio/webm')
          await supabase.from('post_media').insert({ post_id: postId, type: 'voice', storage_url: url })
        }
      }
      onDone()
    } catch (err) {
      setError(err?.message ?? 'خطأ في النشر')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-brand-text text-xl font-bold">مراجعة ونشر</h2>

      {/* Preview card */}
      <PostCard post={previewPost} />

      {/* Network selector */}
      {networks.length > 1 && (
        <div>
          <label className="text-brand-muted text-sm mb-2 block">النشر في الشبكات</label>
          {networks.map((n) => (
            <label key={n.id} className="flex items-center gap-3 py-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedNetworks.includes(n.id)}
                onChange={() => toggleNetwork(n.id)}
                className="accent-brand-primary w-4 h-4"
              />
              <span className="text-brand-text text-sm">{n.name}</span>
            </label>
          ))}
        </div>
      )}

      {error && <p className="text-brand-error text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={publishing}
          className="flex-1 py-3 border border-brand-border text-brand-muted rounded-xl disabled:opacity-50"
        >
          رجوع
        </button>
        <button
          onClick={publish}
          disabled={publishing}
          className="flex-1 py-3 bg-brand-primary text-white rounded-xl font-semibold disabled:opacity-50"
        >
          {publishing ? 'جارٍ النشر...' : 'نشر'}
        </button>
      </div>
    </div>
  )
}
```

### `src/pages/CreatePost/CreatePost.jsx`

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Step1Product from './Step1Product'
import Step2Price from './Step2Price'
import Step3Media from './Step3Media'
import Step4Review from './Step4Review'

const STEPS = ['product', 'price', 'media', 'review']

export default function CreatePost() {
  const navigate = useNavigate()
  const [step, setStep] = useState('product')
  const [data, setData] = useState({})

  function handleStep1(d) { setData((p) => ({ ...p, ...d })); setStep('price') }
  function handleStep2(d) { setData((p) => ({ ...p, ...d })); setStep('media') }
  function handleStep3(d) { setData((p) => ({ ...p, ...d })); setStep('review') }
  function handleDone() { navigate('/feed', { replace: true }) }

  const progress = ((STEPS.indexOf(step) + 1) / STEPS.length) * 100

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col px-6 py-10 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => {
            if (step === 'product') navigate(-1)
            else setStep(STEPS[STEPS.indexOf(step) - 1])
          }}
          className="text-brand-muted"
          aria-label="رجوع"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div className="flex-1 bg-brand-border rounded-full h-1">
          <div
            className="bg-brand-primary h-1 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-brand-muted text-xs">{STEPS.indexOf(step) + 1}/4</span>
      </div>

      <div className="flex-1">
        {step === 'product' && <Step1Product onNext={handleStep1} initialData={data} />}
        {step === 'price' && (
          <Step2Price
            type={data.type}
            onNext={handleStep2}
            onBack={() => setStep('product')}
            initialData={data}
          />
        )}
        {step === 'media' && (
          <Step3Media
            onNext={handleStep3}
            onBack={() => setStep('price')}
            initialData={data}
          />
        )}
        {step === 'review' && (
          <Step4Review
            data={data}
            onBack={() => setStep('media')}
            onDone={handleDone}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 1: Write failing tests**

Create `src/pages/CreatePost/CreatePost.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Step1Product from './Step1Product'
import Step2Price from './Step2Price'

// Mock auth store for Step2Price
vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    profile: { phone: '+96279000001', country: 'JO' },
    session: { user: { id: 'user-1' } },
  })),
}))

// Mock useNetworks for Step2Price
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

  it('calls onNext with correct payload for offer', async () => {
    const onNext = vi.fn()
    wrap(<Step1Product onNext={onNext} />)

    await userEvent.type(screen.getByPlaceholderText(/Augmentin/), 'Amoxicillin 500mg')
    const qtyInput = screen.getByDisplayValue('')
    fireEvent.change(qtyInput, { target: { value: '5' } })

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

  it('calculates discount % live', async () => {
    wrap(<Step2Price type="offer" onNext={vi.fn()} onBack={vi.fn()} />)
    const inputs = screen.getAllByRole('spinbutton')
    fireEvent.change(inputs[0], { target: { value: '10' } }) // original
    fireEvent.change(inputs[1], { target: { value: '7' } })  // price
    await waitFor(() => {
      expect(screen.getByText('-30%')).toBeInTheDocument()
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
```

Run: `npx vitest run src/pages/CreatePost/CreatePost.test.jsx`
Expected: FAIL — files not created

- [ ] **Step 2: Create all Step files** (`Step1Product.jsx`, `Step2Price.jsx`, `Step3Media.jsx`, `Step4Review.jsx`, `CreatePost.jsx`) with code shown above

- [ ] **Step 3: Update `src/App.jsx`** — add `/create` route:

```jsx
import CreatePost from './pages/CreatePost/CreatePost'

// Add BEFORE the * catch-all:
<Route path="/create" element={
  <PrivateRoute><CreatePost /></PrivateRoute>
} />
```

- [ ] **Step 4: Run Create Post tests**

Run: `npx vitest run src/pages/CreatePost/CreatePost.test.jsx`
Expected: 8/8 PASS

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: 64/64 pass

- [ ] **Step 6: Commit**

```bash
git add src/pages/CreatePost/ src/App.jsx
git commit -m "feat: add Create Post wizard (4 steps) with media upload"
```
