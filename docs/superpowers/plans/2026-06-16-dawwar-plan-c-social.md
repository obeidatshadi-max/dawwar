# دوّار — Plan C: Social Features + Deploy

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the app with bottom navigation, Messages/DMs, Networks management, Admin panel, Profile screen, and PWA deployment to Netlify.

**Architecture:** Four-tab layout via `AppLayout` + `BottomNav`. Messages use Supabase `messages` table with Realtime subscription for live DMs. Network admin generates invite tokens stored in `network_invites`. Profile edits upsert to `profiles`. PWA via `vite-plugin-pwa` (Workbox precaching). Deploy to Netlify with `netlify.toml`.

**Tech Stack:** React 18, Vite 5, Tailwind CSS v3, Zustand, React Router v6, @supabase/supabase-js v2, vite-plugin-pwa, Vitest + RTL

---

## Design Tokens (quick reference)

`bg-brand-bg` `bg-brand-card` `border-brand-border` `bg-brand-primary` `text-brand-primary`
`text-brand-text` `text-brand-muted` `text-brand-success` `text-brand-warning`
`bg-brand-offer` `bg-brand-wanted` `bg-brand-whatsapp` `text-brand-error`

---

## File Map

```
src/
├── components/
│   ├── BottomNav.jsx          (4-tab nav, unread badge on رسائل)
│   └── AppLayout.jsx          (content area + BottomNav at bottom)
├── hooks/
│   └── useMessages.js         (inbox threads + thread messages + send)
└── pages/
    ├── Messages/
    │   ├── Inbox.jsx           (thread list grouped by post)
    │   └── Thread.jsx          (DM view with send box + realtime)
    ├── Networks/
    │   ├── Networks.jsx        (my networks list + create + join)
    │   ├── CreateNetwork.jsx   (name / city / country form)
    │   └── AdminPanel.jsx      (members list + invite generator)
    └── Profile/
        └── Profile.jsx         (view/edit pharmacy info + logout)
```

---

## Task 13: Bottom Nav + App Layout

**Files:**
- Create: `src/components/BottomNav.jsx`
- Create: `src/components/AppLayout.jsx`
- Modify: `src/App.jsx` — wrap tab routes in AppLayout, add routes for Messages, Networks, Profile

### `src/components/BottomNav.jsx`

```jsx
import { NavLink } from 'react-router-dom'
import { useUnreadCount } from '../hooks/useMessages'

const TABS = [
  {
    to: '/feed',
    label: 'الرئيسية',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/messages',
    label: 'الرسائل',
    showBadge: true,
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    to: '/networks',
    label: 'شبكاتي',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'حسابي',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const unread = useUnreadCount()

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-brand-card border-t border-brand-border z-20">
      <div className="flex">
        {TABS.map(({ to, label, icon, showBadge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-3 gap-0.5 text-xs transition-colors ${
                isActive ? 'text-brand-primary' : 'text-brand-muted'
              }`
            }
          >
            <div className="relative">
              {icon}
              {showBadge && unread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-offer rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </div>
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
```

### `src/components/AppLayout.jsx`

```jsx
import BottomNav from './BottomNav'

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-brand-bg pb-20">
      {children}
      <BottomNav />
    </div>
  )
}
```

### App.jsx update

Read `src/App.jsx`, then:
1. Add imports: `import AppLayout from './components/AppLayout'`, `import Inbox from './pages/Messages/Inbox'`, `import Networks from './pages/Networks/Networks'`, `import Profile from './pages/Profile/Profile'`
2. Wrap Feed, Inbox, Networks, Profile routes in `<PrivateRoute><AppLayout>...</AppLayout></PrivateRoute>`
3. Add routes: `/messages`, `/messages/:postId`, `/networks`, `/networks/:networkId/admin`, `/profile`

**NOTE:** `useUnreadCount` is exported from `useMessages.js` (Task 14). BottomNav imports it — so Task 13 build will fail tests if `useMessages.js` doesn't exist yet. Solution: create a stub `src/hooks/useMessages.js` as part of Task 13 that exports `useUnreadCount` returning 0, `useMessages` returning empty state. Task 14 will replace it with full implementation.

**Stub `src/hooks/useMessages.js` (create in Task 13, replace in Task 14):**
```js
export function useUnreadCount() { return 0 }
export function useMessages() { return { threads: [], loading: true, error: '' } }
export function useThread() { return { messages: [], loading: true, error: '', send: async () => {} } }
```

### Test: `src/components/BottomNav.test.jsx`

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BottomNav from './BottomNav'

vi.mock('../hooks/useMessages', () => ({
  useUnreadCount: vi.fn(() => 0),
}))

function wrap(ui, path = '/feed') {
  return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>)
}

describe('BottomNav', () => {
  it('renders all four tabs', () => {
    wrap(<BottomNav />)
    expect(screen.getByText('الرئيسية')).toBeInTheDocument()
    expect(screen.getByText('الرسائل')).toBeInTheDocument()
    expect(screen.getByText('شبكاتي')).toBeInTheDocument()
    expect(screen.getByText('حسابي')).toBeInTheDocument()
  })

  it('shows unread badge when unread > 0', () => {
    const { useUnreadCount } = vi.mocked(await import('../hooks/useMessages'))
    useUnreadCount.mockReturnValue(3)
    wrap(<BottomNav />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('does not show badge when unread = 0', () => {
    wrap(<BottomNav />)
    expect(screen.queryByText('0')).toBeNull()
  })
})
```

**Note:** The `vi.mocked(await import(...))` pattern in the second test is fragile. Use this simpler approach instead:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../hooks/useMessages', () => ({
  useUnreadCount: vi.fn(() => 0),
}))

import { useUnreadCount } from '../hooks/useMessages'
import BottomNav from './BottomNav'

function wrap(ui) {
  return render(<MemoryRouter initialEntries={['/feed']}>{ui}</MemoryRouter>)
}

describe('BottomNav', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders all four tabs', () => {
    wrap(<BottomNav />)
    expect(screen.getByText('الرئيسية')).toBeInTheDocument()
    expect(screen.getByText('الرسائل')).toBeInTheDocument()
    expect(screen.getByText('شبكاتي')).toBeInTheDocument()
    expect(screen.getByText('حسابي')).toBeInTheDocument()
  })

  it('shows unread badge when unread > 0', () => {
    useUnreadCount.mockReturnValue(3)
    wrap(<BottomNav />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('does not show badge when unread = 0', () => {
    useUnreadCount.mockReturnValue(0)
    wrap(<BottomNav />)
    expect(screen.queryByText('0')).toBeNull()
  })
})
```

- [ ] **Step 1: Write failing test**

Create `src/components/BottomNav.test.jsx` with the code above (second version).
Run: `npx vitest run src/components/BottomNav.test.jsx`
Expected: FAIL

- [ ] **Step 2: Create stub `src/hooks/useMessages.js`**

```js
export function useUnreadCount() { return 0 }
export function useMessages() { return { threads: [], loading: true, error: '' } }
export function useThread() { return { messages: [], loading: true, error: '', send: async () => {} } }
```

- [ ] **Step 3: Create `src/components/BottomNav.jsx`** with code above

- [ ] **Step 4: Create `src/components/AppLayout.jsx`** with code above

- [ ] **Step 5: Update `src/App.jsx`**

Read current App.jsx, then add:

```jsx
import AppLayout from './components/AppLayout'
import Inbox from './pages/Messages/Inbox'
import Networks from './pages/Networks/Networks'
import Profile from './pages/Profile/Profile'

// Stub screens (replaced in later tasks) — create these placeholder files:
// src/pages/Messages/Inbox.jsx — returns <div className="p-6 text-brand-muted">الرسائل قادمة...</div>
// src/pages/Networks/Networks.jsx — returns <div className="p-6 text-brand-muted">شبكاتي قادمة...</div>
// src/pages/Profile/Profile.jsx — returns <div className="p-6 text-brand-muted">حسابي قادم...</div>
```

Update /feed route:
```jsx
<Route path="/feed" element={
  <PrivateRoute>
    <AppLayout><Feed /></AppLayout>
  </PrivateRoute>
} />
```

Add new routes before the * catch-all:
```jsx
<Route path="/messages" element={<PrivateRoute><AppLayout><Inbox /></AppLayout></PrivateRoute>} />
<Route path="/messages/:postId" element={<PrivateRoute><AppLayout><Inbox /></AppLayout></PrivateRoute>} />
<Route path="/networks" element={<PrivateRoute><AppLayout><Networks /></AppLayout></PrivateRoute>} />
<Route path="/networks/:networkId/admin" element={<PrivateRoute><AppLayout><Networks /></AppLayout></PrivateRoute>} />
<Route path="/profile" element={<PrivateRoute><AppLayout><Profile /></AppLayout></PrivateRoute>} />
```

Also create stub files:
- `src/pages/Messages/Inbox.jsx`
- `src/pages/Networks/Networks.jsx`
- `src/pages/Profile/Profile.jsx`

Each stub returns `<div className="px-6 py-10 text-brand-muted text-sm">[screen name] — قادمة في التحديث القادم</div>`

- [ ] **Step 6: Run BottomNav tests**

Run: `npx vitest run src/components/BottomNav.test.jsx`
Expected: 3/3 PASS

- [ ] **Step 7: Run all tests**

Run: `npx vitest run`
Expected: 68/68 pass (65 + 3 new)

- [ ] **Step 8: Commit**

```bash
git add src/components/ src/hooks/useMessages.js src/pages/Messages/Inbox.jsx src/pages/Networks/Networks.jsx src/pages/Profile/Profile.jsx src/App.jsx
git commit -m "feat: add BottomNav, AppLayout, and stub screens for Messages/Networks/Profile"
```

---

## Task 14: Messages — Inbox + Thread

**Files:**
- Replace: `src/hooks/useMessages.js` (full implementation)
- Replace: `src/pages/Messages/Inbox.jsx` (full implementation)
- Create: `src/pages/Messages/Thread.jsx`
- Test: `src/hooks/useMessages.test.js`
- Update: `src/App.jsx` — `/messages/:postId` uses Thread

### `src/hooks/useMessages.js`

```js
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

// Returns count of unread messages where current user is recipient
export function useUnreadCount() {
  const { session } = useAuthStore()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!session) return
    let cancelled = false

    async function fetchCount() {
      const { count: c } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', session.user.id)
        .is('read_at', null)
      if (!cancelled) setCount(c ?? 0)
    }

    fetchCount()

    const channel = supabase
      .channel('unread-count')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'messages',
        filter: `recipient_id=eq.${session.user.id}`,
      }, fetchCount)
      .subscribe()

    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [session])

  return count
}

// Returns inbox threads: latest message per (post_id, other_party) grouping
export function useMessages() {
  const { session } = useAuthStore()
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchThreads = useCallback(async () => {
    if (!session) return
    setLoading(true)
    setError('')
    try {
      // Fetch all messages involving me
      const { data, error: fetchErr } = await supabase
        .from('messages')
        .select(`
          id, post_id, body, created_at, read_at,
          sender:profiles!messages_sender_id_fkey(id, pharmacy_name),
          recipient:profiles!messages_recipient_id_fkey(id, pharmacy_name),
          post:posts(id, product_name, type)
        `)
        .or(`sender_id.eq.${session.user.id},recipient_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false })

      if (fetchErr) throw fetchErr

      // Group by post_id — one thread per post (latest message per post)
      const seen = new Set()
      const grouped = (data ?? []).filter((m) => {
        if (seen.has(m.post_id)) return false
        seen.add(m.post_id)
        return true
      })

      setThreads(grouped)
    } catch (err) {
      setError(err?.message ?? 'خطأ في تحميل الرسائل')
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => { fetchThreads() }, [fetchThreads])

  useEffect(() => {
    if (!session) return
    const channel = supabase
      .channel('inbox')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'messages',
      }, fetchThreads)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [session, fetchThreads])

  return { threads, loading, error }
}

// Returns messages for a specific post thread + send function
export function useThread(postId) {
  const { session } = useAuthStore()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchMessages = useCallback(async () => {
    if (!session || !postId) return
    setLoading(true)
    try {
      const { data, error: fetchErr } = await supabase
        .from('messages')
        .select(`
          id, body, created_at, read_at, media_url, media_type,
          sender:profiles!messages_sender_id_fkey(id, pharmacy_name)
        `)
        .eq('post_id', postId)
        .or(`sender_id.eq.${session.user.id},recipient_id.eq.${session.user.id}`)
        .order('created_at', { ascending: true })

      if (fetchErr) throw fetchErr
      setMessages(data ?? [])

      // Mark received messages as read
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('post_id', postId)
        .eq('recipient_id', session.user.id)
        .is('read_at', null)
    } catch (err) {
      setError(err?.message ?? 'خطأ في تحميل الرسالة')
    } finally {
      setLoading(false)
    }
  }, [session, postId])

  useEffect(() => { fetchMessages() }, [fetchMessages])

  useEffect(() => {
    if (!session || !postId) return
    const channel = supabase
      .channel(`thread-${postId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `post_id=eq.${postId}`,
      }, fetchMessages)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [session, postId, fetchMessages])

  async function send({ recipientId, body }) {
    if (!body?.trim() || !session || !postId) return
    const { error: sendErr } = await supabase.from('messages').insert({
      post_id: postId,
      sender_id: session.user.id,
      recipient_id: recipientId,
      body: body.trim(),
    })
    if (sendErr) throw sendErr
  }

  return { messages, loading, error, send }
}
```

### `src/pages/Messages/Inbox.jsx`

```jsx
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useMessages } from '../../hooks/useMessages'

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `${Math.floor(diff / 60)} د`
  if (diff < 86400) return `${Math.floor(diff / 3600)} س`
  return `${Math.floor(diff / 86400)} ي`
}

export default function Inbox() {
  const navigate = useNavigate()
  const { session } = useAuthStore()
  const { threads, loading, error } = useMessages()
  const myId = session?.user?.id

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-brand-text text-xl font-bold">الرسائل</h1>
      </div>

      {error && <p className="text-brand-error text-sm px-4">{error}</p>}

      {threads.length === 0 && !error && (
        <p className="text-brand-muted text-center py-16">لا توجد رسائل بعد</p>
      )}

      <div className="flex flex-col divide-y divide-brand-border">
        {threads.map((thread) => {
          const other = thread.sender?.id === myId ? thread.recipient : thread.sender
          const isUnread = !thread.read_at && thread.sender?.id !== myId
          return (
            <button
              key={thread.post_id}
              onClick={() => navigate(`/messages/${thread.post_id}`)}
              className="flex items-start gap-3 px-4 py-4 text-right w-full hover:bg-brand-card transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium truncate ${isUnread ? 'text-brand-text' : 'text-brand-muted'}`}>
                    {other?.pharmacy_name ?? '—'}
                  </span>
                  <span className="text-xs text-brand-muted flex-shrink-0 mr-2">{timeAgo(thread.created_at)}</span>
                </div>
                <p className="text-xs text-brand-primary truncate mb-0.5" dir="ltr">
                  {thread.post?.product_name}
                </p>
                <p className={`text-xs truncate ${isUnread ? 'text-brand-text font-medium' : 'text-brand-muted'}`}>
                  {thread.body ?? '—'}
                </p>
              </div>
              {isUnread && (
                <div className="w-2.5 h-2.5 rounded-full bg-brand-primary mt-1.5 flex-shrink-0" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

### `src/pages/Messages/Thread.jsx`

```jsx
import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useThread } from '../../hooks/useMessages'

export default function Thread() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const { session } = useAuthStore()
  const { messages, loading, error, send } = useThread(postId)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState('')
  const [sendErr, setSendErr] = useState('')
  const bottomRef = useRef(null)
  const myId = session?.user?.id

  // Derive recipient from messages (first message from someone else)
  const recipientId = messages.find((m) => m.sender?.id !== myId)?.sender?.id ?? null

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!body.trim() || !recipientId) return
    setSending(true)
    setSendErr('')
    try {
      await send({ recipientId, body })
      setBody('')
    } catch (err) {
      setSendErr(err?.message ?? 'خطأ في الإرسال')
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const otherName = messages.find((m) => m.sender?.id !== myId)?.sender?.pharmacy_name ?? 'المحادثة'

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-brand-border">
        <button onClick={() => navigate('/messages')} className="text-brand-muted" aria-label="رجوع">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <h1 className="text-brand-text font-semibold text-base flex-1">{otherName}</h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-32 flex flex-col gap-3">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {error && <p className="text-brand-error text-sm text-center">{error}</p>}

        {messages.map((msg) => {
          const isMe = msg.sender?.id === myId
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
                isMe
                  ? 'bg-brand-primary text-white rounded-br-sm'
                  : 'bg-brand-card border border-brand-border text-brand-text rounded-bl-sm'
              }`}>
                {msg.body}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="fixed bottom-20 inset-x-0 bg-brand-card border-t border-brand-border px-4 py-3 flex gap-3">
        {sendErr && <p className="text-brand-error text-xs mb-1 absolute -top-6 right-4">{sendErr}</p>}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="اكتب رسالتك..."
          className="flex-1 bg-brand-bg border border-brand-border rounded-xl px-4 py-2 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-primary resize-none"
        />
        <button
          onClick={handleSend}
          disabled={!body.trim() || sending || !recipientId}
          className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center disabled:opacity-40"
          aria-label="إرسال"
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  )
}
```

### Update `src/App.jsx`

Replace the `/messages/:postId` route stub with Thread:
```jsx
import Thread from './pages/Messages/Thread'
// ...
<Route path="/messages/:postId" element={<PrivateRoute><AppLayout><Thread /></AppLayout></PrivateRoute>} />
```

### Test: `src/hooks/useMessages.test.js`

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useMessages, useUnreadCount } from './useMessages'

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

vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    session: { user: { id: 'me' } },
  })),
}))

import { supabase } from '../lib/supabase'

const mockThreads = [
  {
    id: 'm1', post_id: 'p1', body: 'هل متوفر؟', created_at: new Date().toISOString(), read_at: null,
    sender: { id: 'other', pharmacy_name: 'صيدلية ب' },
    recipient: { id: 'me', pharmacy_name: 'صيدلية أ' },
    post: { id: 'p1', product_name: 'Augmentin', type: 'offer' },
  },
]

describe('useMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: mockThreads, error: null })),
      catch: vi.fn().mockReturnThis(),
    }
    supabase.from.mockReturnValue(chain)
  })

  it('fetches and returns threads', async () => {
    const { result } = renderHook(() => useMessages())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.threads).toHaveLength(1)
    expect(result.current.threads[0].post_id).toBe('p1')
  })

  it('deduplicates threads by post_id', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({
        data: [mockThreads[0], { ...mockThreads[0], id: 'm2' }], // duplicate post_id
        error: null,
      })),
      catch: vi.fn().mockReturnThis(),
    }
    supabase.from.mockReturnValue(chain)
    const { result } = renderHook(() => useMessages())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.threads).toHaveLength(1)
  })

  it('sets error on fetch failure', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: null, error: new Error('RLS denied') })),
      catch: vi.fn().mockReturnThis(),
    }
    supabase.from.mockReturnValue(chain)
    const { result } = renderHook(() => useMessages())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toContain('RLS denied')
  })
})

describe('useUnreadCount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ count: 5, error: null })),
      catch: vi.fn().mockReturnThis(),
    }
    supabase.from.mockReturnValue(chain)
  })

  it('returns unread count from supabase', async () => {
    const { result } = renderHook(() => useUnreadCount())
    await waitFor(() => expect(result.current).toBe(5))
  })
})
```

- [ ] **Step 1: Write failing tests**

Create `src/hooks/useMessages.test.js`.
Run: `npx vitest run src/hooks/useMessages.test.js`
Expected: FAIL — stub useMessages doesn't match full API

- [ ] **Step 2: Replace `src/hooks/useMessages.js`** with full implementation

- [ ] **Step 3: Create `src/pages/Messages/Thread.jsx`**

- [ ] **Step 4: Replace `src/pages/Messages/Inbox.jsx`** with full implementation

- [ ] **Step 5: Update `src/App.jsx`** — add Thread import, update `/messages/:postId` route

- [ ] **Step 6: Run messages tests**

Run: `npx vitest run src/hooks/useMessages.test.js`
Expected: 4/4 PASS

- [ ] **Step 7: Run all tests**

Run: `npx vitest run`
Expected: 72/72 pass (68 + 4 new)

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useMessages.js src/pages/Messages/ src/App.jsx
git commit -m "feat: add Messages inbox and thread with realtime DMs"
```

---

## Task 15: Networks Screen + Create Network

**Files:**
- Replace: `src/pages/Networks/Networks.jsx` (full implementation)
- Create: `src/pages/Networks/CreateNetwork.jsx`
- Test: `src/pages/Networks/Networks.test.jsx`
- Update: `src/App.jsx` — `/networks/new` route

### `src/pages/Networks/Networks.jsx`

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNetworks } from '../../hooks/useNetworks'
import { useAuthStore } from '../../store/authStore'

export default function Networks() {
  const navigate = useNavigate()
  const { networks, loading } = useNetworks()
  const { profile } = useAuthStore()

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="px-4 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-brand-text text-xl font-bold">شبكاتي</h1>
        <button
          onClick={() => navigate('/networks/new')}
          className="text-brand-primary text-sm font-medium"
        >
          + إنشاء شبكة
        </button>
      </div>

      {networks.length === 0 && (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-brand-text font-semibold mb-2">لا توجد شبكات بعد</p>
          <p className="text-brand-muted text-sm mb-6">أنشئ شبكة أو انضم إحدى الشبكات برابط دعوة</p>
          <button
            onClick={() => navigate('/networks/new')}
            className="px-6 py-3 bg-brand-primary text-white rounded-xl font-semibold"
          >
            إنشاء شبكة جديدة
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 px-4 pb-6">
        {networks.map((n) => (
          <div key={n.id} className="bg-brand-card border border-brand-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-brand-text font-semibold">{n.name}</h3>
              {n.role === 'admin' && (
                <span className="text-xs text-brand-primary border border-brand-primary px-2 py-0.5 rounded-full">
                  مدير
                </span>
              )}
            </div>
            <p className="text-brand-muted text-sm mb-3">{n.city} · {n.country}</p>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/feed?network=${n.id}`)}
                className="flex-1 py-2 rounded-xl bg-brand-primary text-white text-sm"
              >
                الرئيسية
              </button>
              {n.role === 'admin' && (
                <button
                  onClick={() => navigate(`/networks/${n.id}/admin`)}
                  className="flex-1 py-2 rounded-xl border border-brand-border text-brand-muted text-sm"
                >
                  إدارة
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### `src/pages/Networks/CreateNetwork.jsx`

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'

export default function CreateNetwork() {
  const navigate = useNavigate()
  const { session, profile } = useAuthStore()
  const [name, setName] = useState('')
  const [city, setCity] = useState(profile?.city ?? '')
  const [country, setCountry] = useState(profile?.country ?? 'JO')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim()) { setError('اسم الشبكة مطلوب'); return }
    if (loading) return
    setLoading(true)
    setError('')
    try {
      // Create network
      const { data: network, error: netErr } = await supabase
        .from('networks')
        .insert({
          name: name.trim(),
          city: city.trim() || null,
          country,
          description: description.trim() || null,
          created_by: session.user.id,
        })
        .select('id')
        .single()
      if (netErr) throw netErr

      // Add creator as admin member
      const { error: memberErr } = await supabase
        .from('network_members')
        .insert({
          network_id: network.id,
          profile_id: session.user.id,
          role: 'admin',
          status: 'active',
        })
      if (memberErr) throw memberErr

      navigate(`/networks/${network.id}/admin`, { replace: true })
    } catch (err) {
      setError(err?.message ?? 'خطأ في إنشاء الشبكة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg px-6 py-10 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="text-brand-muted" aria-label="رجوع">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <h1 className="text-brand-text text-xl font-bold">إنشاء شبكة جديدة</h1>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <label className="text-brand-muted text-sm mb-1 block">اسم الشبكة</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: صيدليات شمال عمّان"
            className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text placeholder:text-brand-muted outline-none focus:border-brand-primary"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-brand-muted text-sm mb-1 block">المدينة</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:border-brand-primary"
            />
          </div>
          <div className="flex-1">
            <label className="text-brand-muted text-sm mb-1 block">الدولة</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:border-brand-primary"
            >
              <option value="JO">الأردن</option>
              <option value="IQ">العراق</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-brand-muted text-sm mb-1 block">وصف (اختياري)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="وصف قصير للشبكة..."
            className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text placeholder:text-brand-muted outline-none focus:border-brand-primary resize-none"
          />
        </div>

        {error && <p className="text-brand-error text-sm">{error}</p>}

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full py-3 bg-brand-primary text-white rounded-xl font-semibold disabled:opacity-50"
        >
          {loading ? 'جارٍ الإنشاء...' : 'إنشاء الشبكة'}
        </button>
      </div>
    </div>
  )
}
```

### Test: `src/pages/Networks/Networks.test.jsx`

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Networks from './Networks'

vi.mock('../../hooks/useNetworks', () => ({
  useNetworks: vi.fn(),
}))

vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn(() => ({ profile: { city: 'عمّان', country: 'JO' } })),
}))

import { useNetworks } from '../../hooks/useNetworks'

function wrap(ui) {
  return render(<MemoryRouter initialEntries={['/networks']}>{ui}</MemoryRouter>)
}

describe('Networks', () => {
  it('shows spinner while loading', () => {
    useNetworks.mockReturnValue({ networks: [], loading: true })
    const { container } = wrap(<Networks />)
    expect(container.querySelector('.animate-spin')).toBeTruthy()
  })

  it('shows empty state when no networks', () => {
    useNetworks.mockReturnValue({ networks: [], loading: false })
    wrap(<Networks />)
    expect(screen.getByText('لا توجد شبكات بعد')).toBeInTheDocument()
  })

  it('lists network name and role badge for admin', () => {
    useNetworks.mockReturnValue({
      networks: [{ id: 'n1', name: 'شبكة الشمال', city: 'عمّان', country: 'JO', role: 'admin' }],
      loading: false,
    })
    wrap(<Networks />)
    expect(screen.getByText('شبكة الشمال')).toBeInTheDocument()
    expect(screen.getByText('مدير')).toBeInTheDocument()
  })

  it('does not show admin badge for member role', () => {
    useNetworks.mockReturnValue({
      networks: [{ id: 'n1', name: 'شبكة الجنوب', city: 'إربد', country: 'JO', role: 'member' }],
      loading: false,
    })
    wrap(<Networks />)
    expect(screen.queryByText('مدير')).toBeNull()
  })

  it('shows إدارة button for admin only', () => {
    useNetworks.mockReturnValue({
      networks: [{ id: 'n1', name: 'شبكة أ', city: 'عمّان', country: 'JO', role: 'admin' }],
      loading: false,
    })
    wrap(<Networks />)
    expect(screen.getByText('إدارة')).toBeInTheDocument()
  })
})
```

### App.jsx update

```jsx
import CreateNetwork from './pages/Networks/CreateNetwork'

// Add before * catch-all:
<Route path="/networks/new" element={<PrivateRoute><CreateNetwork /></PrivateRoute>} />
<Route path="/networks/:networkId/admin" element={<PrivateRoute><AppLayout><AdminPanel /></AppLayout></PrivateRoute>} />
// AdminPanel is Task 16 — use stub for now:
// Create src/pages/Networks/AdminPanel.jsx stub
```

- [ ] **Step 1: Write failing tests**

Create `src/pages/Networks/Networks.test.jsx`.
Run: `npx vitest run src/pages/Networks/Networks.test.jsx`
Expected: FAIL

- [ ] **Step 2: Replace `src/pages/Networks/Networks.jsx`** with full implementation

- [ ] **Step 3: Create `src/pages/Networks/CreateNetwork.jsx`**

- [ ] **Step 4: Create stub `src/pages/Networks/AdminPanel.jsx`**

```jsx
export default function AdminPanel() {
  return <div className="px-6 py-10 text-brand-muted text-sm">إدارة الشبكة — قادمة...</div>
}
```

- [ ] **Step 5: Update `src/App.jsx`** — add CreateNetwork + AdminPanel stub routes

- [ ] **Step 6: Run tests**

Run: `npx vitest run src/pages/Networks/Networks.test.jsx`
Expected: 5/5 PASS

- [ ] **Step 7: Run all tests**

Run: `npx vitest run`
Expected: 77/77 pass (72 + 5 new)

- [ ] **Step 8: Commit**

```bash
git add src/pages/Networks/ src/App.jsx
git commit -m "feat: add Networks screen and CreateNetwork form"
```

---

## Task 16: Admin Panel — Members + Invite Generator

**Files:**
- Replace: `src/pages/Networks/AdminPanel.jsx` (full implementation)
- Test: `src/pages/Networks/AdminPanel.test.jsx`

### `src/pages/Networks/AdminPanel.jsx`

```jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'

const EXPIRY_OPTIONS = [
  { label: '٧ أيام', days: 7 },
  { label: '١٤ يوماً', days: 14 },
  { label: '٣٠ يوماً', days: 30 },
]

export default function AdminPanel() {
  const { networkId } = useParams()
  const navigate = useNavigate()
  const { session } = useAuthStore()

  const [network, setNetwork] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteLink, setInviteLink] = useState('')
  const [inviteDays, setInviteDays] = useState(7)
  const [inviteMax, setInviteMax] = useState(50)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!networkId || !session) return
    let cancelled = false
    async function fetch() {
      const [{ data: net }, { data: mems }] = await Promise.all([
        supabase.from('networks').select('id, name, city, country').eq('id', networkId).single(),
        supabase
          .from('network_members')
          .select('id, role, joined_at, profile:profiles(id, pharmacy_name, city)')
          .eq('network_id', networkId)
          .eq('status', 'active'),
      ])
      if (!cancelled) {
        setNetwork(net)
        setMembers(mems ?? [])
        setLoading(false)
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [networkId, session])

  async function generateInvite() {
    if (generating) return
    setGenerating(true)
    setError('')
    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + inviteDays)

      const { data: invite, error: invErr } = await supabase
        .from('network_invites')
        .insert({
          network_id: networkId,
          created_by: session.user.id,
          expires_at: expiresAt.toISOString(),
          max_uses: Number(inviteMax),
          uses_count: 0,
        })
        .select('token')
        .single()
      if (invErr) throw invErr

      const link = `${window.location.origin}/join?token=${invite.token}`
      setInviteLink(link)
    } catch (err) {
      setError(err?.message ?? 'خطأ في توليد الرابط')
    } finally {
      setGenerating(false)
    }
  }

  async function removeMember(memberId) {
    const { error: delErr } = await supabase
      .from('network_members')
      .delete()
      .eq('id', memberId)
    if (!delErr) setMembers((prev) => prev.filter((m) => m.id !== memberId))
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const waShare = inviteLink
    ? `https://wa.me/?text=${encodeURIComponent(`انضم إلى شبكة ${network?.name ?? ''} على تطبيق دوّار:\n${inviteLink}`)}`
    : null

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4 border-b border-brand-border">
        <button onClick={() => navigate('/networks')} className="text-brand-muted" aria-label="رجوع">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <h1 className="text-brand-text text-xl font-bold">{network?.name}</h1>
      </div>

      <div className="px-4 py-6 flex flex-col gap-6">
        {/* Invite generator */}
        <section>
          <h2 className="text-brand-text font-semibold mb-3">توليد رابط دعوة</h2>
          <div className="bg-brand-card border border-brand-border rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-brand-muted text-xs mb-1 block">مدة الصلاحية</label>
                <select
                  value={inviteDays}
                  onChange={(e) => setInviteDays(Number(e.target.value))}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-brand-text text-sm outline-none"
                >
                  {EXPIRY_OPTIONS.map((o) => (
                    <option key={o.days} value={o.days}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-brand-muted text-xs mb-1 block">أقصى عدد استخدامات</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={inviteMax}
                  onChange={(e) => setInviteMax(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-brand-text text-sm outline-none"
                />
              </div>
            </div>

            <button
              onClick={generateInvite}
              disabled={generating}
              className="w-full py-2.5 bg-brand-primary text-white rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {generating ? 'جارٍ التوليد...' : 'توليد رابط الدعوة'}
            </button>

            {inviteLink && (
              <div className="flex flex-col gap-2">
                <p className="text-brand-muted text-xs break-all">{inviteLink}</p>
                <div className="flex gap-2">
                  <button
                    onClick={copyLink}
                    className="flex-1 py-2 rounded-xl border border-brand-border text-brand-muted text-sm"
                  >
                    {copied ? '✓ تم النسخ' : 'نسخ الرابط'}
                  </button>
                  <a
                    href={waShare}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 rounded-xl bg-brand-whatsapp text-white text-sm text-center"
                  >
                    مشاركة واتساب
                  </a>
                </div>
              </div>
            )}

            {error && <p className="text-brand-error text-xs">{error}</p>}
          </div>
        </section>

        {/* Members list */}
        <section>
          <h2 className="text-brand-text font-semibold mb-3">الأعضاء ({members.length})</h2>
          <div className="flex flex-col gap-2">
            {members.map((m) => (
              <div key={m.id} className="bg-brand-card border border-brand-border rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-brand-text text-sm font-medium">{m.profile?.pharmacy_name}</p>
                  <p className="text-brand-muted text-xs">{m.profile?.city} · {m.role === 'admin' ? 'مدير' : 'عضو'}</p>
                </div>
                {m.profile?.id !== session?.user?.id && m.role !== 'admin' && (
                  <button
                    onClick={() => removeMember(m.id)}
                    className="text-brand-error text-xs px-3 py-1 rounded-lg border border-brand-error"
                  >
                    إزالة
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
```

### Test: `src/pages/Networks/AdminPanel.test.jsx`

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AdminPanel from './AdminPanel'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    session: { user: { id: 'admin-id' } },
  })),
}))

import { supabase } from '../../lib/supabase'

const mockNetwork = { id: 'net-1', name: 'شبكة الشمال', city: 'عمّان', country: 'JO' }
const mockMembers = [
  { id: 'mem-1', role: 'admin', joined_at: new Date().toISOString(), profile: { id: 'admin-id', pharmacy_name: 'صيدلية أ', city: 'عمّان' } },
  { id: 'mem-2', role: 'member', joined_at: new Date().toISOString(), profile: { id: 'other-id', pharmacy_name: 'صيدلية ب', city: 'عمّان' } },
]

function makeSupabaseMock() {
  const netChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: mockNetwork, error: null }),
  }
  const memChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => resolve({ data: mockMembers, error: null })),
    catch: vi.fn().mockReturnThis(),
  }
  supabase.from.mockImplementation((table) => {
    if (table === 'networks') return netChain
    return memChain
  })
  return { netChain, memChain }
}

function wrap() {
  return render(
    <MemoryRouter initialEntries={['/networks/net-1/admin']}>
      <Routes>
        <Route path="/networks/:networkId/admin" element={<AdminPanel />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('AdminPanel', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows network name after loading', async () => {
    makeSupabaseMock()
    wrap()
    await waitFor(() => expect(screen.getByText('شبكة الشمال')).toBeInTheDocument())
  })

  it('shows member list', async () => {
    makeSupabaseMock()
    wrap()
    await waitFor(() => expect(screen.getByText('صيدلية ب')).toBeInTheDocument())
  })

  it('does not show remove button for self (admin)', async () => {
    makeSupabaseMock()
    wrap()
    await waitFor(() => screen.getByText('صيدلية أ'))
    // Admin (self) should not have remove button
    const cards = screen.queryAllByText('إزالة')
    expect(cards).toHaveLength(1) // only for صيدلية ب
  })

  it('shows invite generator UI', async () => {
    makeSupabaseMock()
    wrap()
    await waitFor(() => expect(screen.getByText('توليد رابط الدعوة')).toBeInTheDocument())
  })
})
```

- [ ] **Step 1: Write failing tests**

Create `src/pages/Networks/AdminPanel.test.jsx`.
Run: `npx vitest run src/pages/Networks/AdminPanel.test.jsx`
Expected: FAIL (stub doesn't have the UI)

- [ ] **Step 2: Replace `src/pages/Networks/AdminPanel.jsx`** with full implementation

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/pages/Networks/AdminPanel.test.jsx`
Expected: 4/4 PASS

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: 81/81 pass (77 + 4)

- [ ] **Step 5: Commit**

```bash
git add src/pages/Networks/AdminPanel.jsx src/pages/Networks/AdminPanel.test.jsx
git commit -m "feat: add Admin Panel with invite generator and member management"
```

---

## Task 17: Profile Screen

**Files:**
- Replace: `src/pages/Profile/Profile.jsx` (full implementation)
- Test: `src/pages/Profile/Profile.test.jsx`

### `src/pages/Profile/Profile.jsx`

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'

export default function Profile() {
  const navigate = useNavigate()
  const { profile, setProfile, clear } = useAuthStore()

  const [editing, setEditing] = useState(false)
  const [pharmacyName, setPharmacyName] = useState(profile?.pharmacy_name ?? '')
  const [ownerName, setOwnerName] = useState(profile?.owner_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [city, setCity] = useState(profile?.city ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!pharmacyName.trim() || !ownerName.trim() || !city.trim()) {
      setError('جميع الحقول مطلوبة')
      return
    }
    setSaving(true)
    setError('')
    try {
      const updates = {
        pharmacy_name: pharmacyName.trim(),
        owner_name: ownerName.trim(),
        phone: phone.trim(),
        city: city.trim(),
      }
      const { error: saveErr } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id)
      if (saveErr) throw saveErr
      setProfile({ ...profile, ...updates })
      setEditing(false)
    } catch (err) {
      setError(err?.message ?? 'خطأ في الحفظ')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    clear()
    navigate('/onboarding', { replace: true })
  }

  if (!profile) return null

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="px-4 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-brand-text text-xl font-bold">حسابي</h1>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-brand-primary text-sm">
            تعديل
          </button>
        )}
      </div>

      <div className="px-4 flex flex-col gap-5">
        {/* Avatar placeholder */}
        <div className="flex items-center gap-4 bg-brand-card border border-brand-border rounded-2xl p-4">
          <div className="w-14 h-14 rounded-full bg-brand-primary flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {profile.pharmacy_name?.[0] ?? '؟'}
          </div>
          <div>
            <p className="text-brand-text font-semibold">{profile.pharmacy_name}</p>
            <p className="text-brand-muted text-sm">{profile.city} · {profile.country === 'JO' ? 'الأردن' : 'العراق'}</p>
          </div>
        </div>

        {editing ? (
          <div className="bg-brand-card border border-brand-border rounded-2xl p-4 flex flex-col gap-4">
            {[
              { label: 'اسم الصيدلية', value: pharmacyName, set: setPharmacyName },
              { label: 'اسم صاحب الصيدلية', value: ownerName, set: setOwnerName },
              { label: 'رقم الواتساب', value: phone, set: setPhone, dir: 'ltr' },
              { label: 'المدينة', value: city, set: setCity },
            ].map(({ label, value, set, dir }) => (
              <div key={label}>
                <label className="text-brand-muted text-xs mb-1 block">{label}</label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  dir={dir}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:border-brand-primary text-sm"
                />
              </div>
            ))}

            {error && <p className="text-brand-error text-sm">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => { setEditing(false); setError('') }}
                className="flex-1 py-2.5 border border-brand-border text-brand-muted rounded-xl text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-brand-primary text-white rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'جارٍ الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-brand-card border border-brand-border rounded-2xl p-4 flex flex-col gap-3">
            {[
              ['صاحب الصيدلية', profile.owner_name],
              ['الواتساب', profile.phone],
              ['الموقع', profile.location_label ?? profile.city],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between">
                <span className="text-brand-muted text-sm">{label}</span>
                <span className="text-brand-text text-sm font-medium text-left" dir="auto">{value ?? '—'}</span>
              </div>
            ))}
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-3 border border-brand-error text-brand-error rounded-xl text-sm font-medium mt-4"
        >
          تسجيل الخروج
        </button>
      </div>
    </div>
  )
}
```

### Test: `src/pages/Profile/Profile.test.jsx`

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Profile from './Profile'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    })),
    auth: { signOut: vi.fn().mockResolvedValue({}) },
  },
}))

const mockProfile = {
  id: 'user-1',
  pharmacy_name: 'صيدلية النور',
  owner_name: 'أحمد محمد',
  phone: '+96279000001',
  city: 'عمّان',
  country: 'JO',
  location_label: 'عمّان — الشميساني',
}

const mockClear = vi.fn()
const mockSetProfile = vi.fn()

vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    profile: mockProfile,
    setProfile: mockSetProfile,
    clear: mockClear,
  })),
}))

function wrap() {
  return render(<MemoryRouter><Profile /></MemoryRouter>)
}

describe('Profile', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows pharmacy name and city', () => {
    wrap()
    expect(screen.getByText('صيدلية النور')).toBeInTheDocument()
    expect(screen.getAllByText(/عمّان/).length).toBeGreaterThan(0)
  })

  it('shows edit button and enters edit mode on click', async () => {
    wrap()
    await userEvent.click(screen.getByText('تعديل'))
    expect(screen.getByDisplayValue('صيدلية النور')).toBeInTheDocument()
  })

  it('shows validation error when required field empty', async () => {
    wrap()
    await userEvent.click(screen.getByText('تعديل'))
    const pharmacyInput = screen.getByDisplayValue('صيدلية النور')
    await userEvent.clear(pharmacyInput)
    await userEvent.click(screen.getByText('حفظ'))
    expect(screen.getByText('جميع الحقول مطلوبة')).toBeInTheDocument()
  })

  it('shows logout button', () => {
    wrap()
    expect(screen.getByText('تسجيل الخروج')).toBeInTheDocument()
  })

  it('calls signOut and clear on logout', async () => {
    const { supabase } = await import('../../lib/supabase')
    wrap()
    await userEvent.click(screen.getByText('تسجيل الخروج'))
    expect(supabase.auth.signOut).toHaveBeenCalled()
    expect(mockClear).toHaveBeenCalled()
  })
})
```

- [ ] **Step 1: Write failing tests**

Create `src/pages/Profile/Profile.test.jsx`.
Run: `npx vitest run src/pages/Profile/Profile.test.jsx`
Expected: FAIL (stub)

- [ ] **Step 2: Replace `src/pages/Profile/Profile.jsx`** with full implementation

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/pages/Profile/Profile.test.jsx`
Expected: 5/5 PASS

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: 86/86 pass (81 + 5)

- [ ] **Step 5: Commit**

```bash
git add src/pages/Profile/Profile.jsx src/pages/Profile/Profile.test.jsx
git commit -m "feat: add Profile screen with edit and logout"
```

---

## Task 18: PWA Setup + Netlify Deploy

**Files:**
- Modify: `package.json` — add `vite-plugin-pwa`
- Modify: `vite.config.js` — add VitePWA plugin config
- Create: `public/icons/icon-192.png` — (placeholder, user must supply)
- Create: `netlify.toml`

### Install PWA plugin

```bash
npm install -D vite-plugin-pwa
```

### `vite.config.js` update

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: false, // use existing public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.js',
  },
})
```

### `netlify.toml`

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "20"
```

### Steps

- [ ] **Step 1: Install vite-plugin-pwa**

```bash
cd "C:\Users\shadi\Desktop\AI APP 2026\dawwar"
npm install -D vite-plugin-pwa
```

Expected: added to devDependencies

- [ ] **Step 2: Update `vite.config.js`** with VitePWA config shown above

- [ ] **Step 3: Create `netlify.toml`** with content shown above

- [ ] **Step 4: Run all tests** (ensure vite config change didn't break tests)

```bash
npx vitest run
```

Expected: 86/86 pass

- [ ] **Step 5: Build**

```bash
npm run build
```

Expected: `dist/` created, `dist/sw.js` present (service worker), no build errors

- [ ] **Step 6: Commit**

```bash
git add vite.config.js netlify.toml package.json package-lock.json
git commit -m "feat: add PWA service worker via vite-plugin-pwa and netlify.toml"
```

- [ ] **Step 7: Deploy to Netlify**

Option A — Netlify CLI (if installed):
```bash
npx netlify deploy --prod --dir=dist
```

Option B — Netlify drag-and-drop: go to netlify.com, drag the `dist/` folder.

Option C — GitHub + Netlify CI: push branch, connect repo in Netlify dashboard (build command `npm run build`, publish `dist`).

Add environment variables in Netlify dashboard → Site settings → Environment variables:
- `VITE_SUPABASE_URL` = `https://fgzgljffrqsupwhvtdvb.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
