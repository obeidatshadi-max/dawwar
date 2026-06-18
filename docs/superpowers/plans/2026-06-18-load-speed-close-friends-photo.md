# Load speed, Close-friends circle, Pharmacy photo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Dawwar PWA enter faster, add a private close-friends circle in شبكاتي, and let pharmacies upload a profile photo.

**Architecture:** Three independent slices. (1) Speed: stop gating the route guards on the profile fetch, and lazy-load page chunks. (2) Close friends: a new owner-only `close_friends` table + `useCloseFriends`/`useNetworkMembers` hooks + a section in `Networks.jsx` + an optional `?friends=1` feed filter. (3) Photo: a `profiles.photo_url` column, reusing the existing `post-media` bucket and `compressImage`/`uploadMedia` helpers, surfaced in onboarding ProfileStep and Profile edit.

**Tech Stack:** React 18, Vite 5, React Router v6, Zustand, Supabase JS, Vitest + @testing-library/react.

## Global Constraints

- All user-facing copy in Arabic, RTL.
- Supabase project ref: `fgzgljffrqsupwhvtdvb`. DB migrations run via Management API SQL (`POST /v1/projects/{ref}/database/query` with the account access token), NOT the SQL editor's `ALTER DATABASE`.
- Storage bucket for media is `post-media` (already public-read). Reuse it.
- Posts author column is `author_id` (FK → `profiles.id`). Feed aliases it as `author:profiles(...)`.
- Run the full suite with `npm test` (vitest). Keep the existing 77 tests green.
- Deploy: local `npm run build` + `netlify deploy --prod --dir dist`. Not Netlify CI.
- Commit after every task.

---

### Task 1: Decouple app entry from the profile fetch

**Files:**
- Modify: `src/hooks/useAuth.js:5-29` (`useAuthInit`)
- Test: `src/hooks/useAuth.test.js` (create)

**Interfaces:**
- Consumes: `useAuthStore` (`setSession`, `setProfile`, `setLoading`, `clear`).
- Produces: unchanged export `useAuthInit()`. New behavior: `loading` flips to `false` on the first auth event, before `fetchProfile` resolves.

- [ ] **Step 1: Write the failing test**

```js
// src/hooks/useAuth.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

let authCallback
let resolveProfile
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((cb) => {
        authCallback = cb
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(() => new Promise((res) => { resolveProfile = res })),
    })),
  },
}))

import { useAuthInit } from './useAuth'
import { useAuthStore } from '../store/authStore'

describe('useAuthInit', () => {
  beforeEach(() => {
    useAuthStore.setState({ session: null, profile: null, loading: true })
  })

  it('clears loading on first auth event before the profile resolves', async () => {
    renderHook(() => useAuthInit())
    authCallback('INITIAL_SESSION', { user: { id: 'u1' } })
    await waitFor(() => expect(useAuthStore.getState().loading).toBe(false))
    // profile fetch still pending
    expect(useAuthStore.getState().profile).toBe(null)
    // resolve it afterwards
    resolveProfile({ data: { id: 'u1', pharmacy_name: 'صيدلية' }, error: null })
    await waitFor(() => expect(useAuthStore.getState().profile?.id).toBe('u1'))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/useAuth.test.js`
Expected: FAIL — `loading` stays `true` until the profile promise resolves (current code awaits `fetchProfile` before `setLoading(false)`).

- [ ] **Step 3: Implement — flip loading before fetching profile**

Replace the `onAuthStateChange` body in `src/hooks/useAuth.js`:

```js
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        if (!initialised) {
          initialised = true
          setLoading(false)
        }
        if (session) {
          fetchProfile(session.user.id).then(setProfile)
        } else {
          clear()
        }
      }
    )
```

(The callback is no longer `async`; the profile fetch runs in the background.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/hooks/useAuth.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAuth.js src/hooks/useAuth.test.js
git commit -m "perf: enter app on auth event without waiting for profile fetch"
```

---

### Task 2: Code-split route pages + shared Spinner

**Files:**
- Create: `src/components/Spinner.jsx`
- Create: `src/components/Spinner.test.jsx`
- Modify: `src/App.jsx` (all page imports + guards + Routes wrapper)

**Interfaces:**
- Produces: `<Spinner />` default export — full-screen centered brand spinner.

- [ ] **Step 1: Write the failing test**

```jsx
// src/components/Spinner.test.jsx
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Spinner from './Spinner'

describe('Spinner', () => {
  it('renders an animated spinner element', () => {
    const { container } = render(<Spinner />)
    expect(container.querySelector('.animate-spin')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/Spinner.test.jsx`
Expected: FAIL — `Cannot find module './Spinner'`.

- [ ] **Step 3: Create the Spinner component**

```jsx
// src/components/Spinner.jsx
export default function Spinner() {
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/Spinner.test.jsx`
Expected: PASS

- [ ] **Step 5: Convert App.jsx to lazy imports**

Replace the page imports (lines 6-16) and use `Spinner` in the guards + a `Suspense` wrapper. Full new `src/App.jsx`:

```jsx
import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useAuthInit } from './hooks/useAuth'
import { usePushSync } from './hooks/useRequestNotifications'
import Spinner from './components/Spinner'
import AppLayout from './components/AppLayout'

const Onboarding = lazy(() => import('./pages/Onboarding/Onboarding'))
const JoinNetwork = lazy(() => import('./pages/JoinNetwork'))
const Feed = lazy(() => import('./pages/Feed/Feed'))
const CreatePost = lazy(() => import('./pages/CreatePost/CreatePost'))
const Inbox = lazy(() => import('./pages/Messages/Inbox'))
const Thread = lazy(() => import('./pages/Messages/Thread'))
const Networks = lazy(() => import('./pages/Networks/Networks'))
const CreateNetwork = lazy(() => import('./pages/Networks/CreateNetwork'))
const AdminPanel = lazy(() => import('./pages/Networks/AdminPanel'))
const Profile = lazy(() => import('./pages/Profile/Profile'))
const SeedTool = lazy(() => import('./pages/Admin/SeedTool'))

function PrivateRoute({ children }) {
  const { session, loading } = useAuthStore()
  if (loading) return <Spinner />
  if (!session) return <Navigate to="/onboarding" replace />
  return children
}

function PublicOnlyRoute({ children }) {
  const { session, loading, profile } = useAuthStore()
  if (loading) return <Spinner />
  if (session && profile) return <Navigate to="/feed" replace />
  return children
}

export default function App() {
  useAuthInit()
  usePushSync()

  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/onboarding" element={
          <PublicOnlyRoute><Onboarding /></PublicOnlyRoute>
        } />
        <Route path="/feed" element={
          <PrivateRoute><AppLayout><Feed /></AppLayout></PrivateRoute>
        } />
        <Route path="/join" element={<JoinNetwork />} />
        <Route path="/create" element={
          <PrivateRoute><CreatePost /></PrivateRoute>
        } />
        <Route path="/messages" element={
          <PrivateRoute><AppLayout><Inbox /></AppLayout></PrivateRoute>
        } />
        <Route path="/messages/:postId" element={
          <PrivateRoute><AppLayout><Thread /></AppLayout></PrivateRoute>
        } />
        <Route path="/networks" element={
          <PrivateRoute><AppLayout><Networks /></AppLayout></PrivateRoute>
        } />
        <Route path="/networks/new" element={
          <PrivateRoute><CreateNetwork /></PrivateRoute>
        } />
        <Route path="/networks/:networkId/admin" element={
          <PrivateRoute><AppLayout><AdminPanel /></AppLayout></PrivateRoute>
        } />
        <Route path="/profile" element={
          <PrivateRoute><AppLayout><Profile /></AppLayout></PrivateRoute>
        } />
        <Route path="/admin/seed" element={
          <PrivateRoute><SeedTool /></PrivateRoute>
        } />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    </Suspense>
  )
}
```

- [ ] **Step 6: Verify build emits separate chunks**

Run: `npm run build`
Expected: build succeeds and `dist/assets/` contains multiple JS chunks named after the lazy pages (e.g. `SeedTool-*.js`, `CreatePost-*.js`) rather than a single bundle. Confirm with: `ls dist/assets/*.js` shows several files.

- [ ] **Step 7: Run full suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/App.jsx src/components/Spinner.jsx src/components/Spinner.test.jsx
git commit -m "perf: lazy-load route pages and share Spinner component"
```

---

### Task 3: DB migration — close_friends table + profiles.photo_url

**Files:**
- Create: `db/2026-06-18-close-friends-and-photo.sql` (record of the migration)

This is an infrastructure task; "test" = the verification query. Run via Management API.

- [ ] **Step 1: Write the migration SQL**

```sql
-- db/2026-06-18-close-friends-and-photo.sql

-- 1. Pharmacy profile photo
alter table public.profiles add column if not exists photo_url text;

-- 2. Close-friends circle (owner-only private favorites)
create table if not exists public.close_friends (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  friend_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (owner_id, friend_profile_id)
);

alter table public.close_friends enable row level security;

create policy "owner can read own close friends"
  on public.close_friends for select
  using (owner_id = auth.uid());

create policy "owner can add close friends"
  on public.close_friends for insert
  with check (owner_id = auth.uid());

create policy "owner can remove close friends"
  on public.close_friends for delete
  using (owner_id = auth.uid());
```

- [ ] **Step 2: Apply via Management API**

POST the SQL to `https://api.supabase.com/v1/projects/fgzgljffrqsupwhvtdvb/database/query` with the account access token (Bearer) and body `{"query": "<sql>"}`.

- [ ] **Step 3: Verify**

Run a verification query via the same endpoint:

```sql
select
  (select count(*) from information_schema.columns
     where table_name='profiles' and column_name='photo_url') as has_photo_url,
  (select count(*) from information_schema.tables
     where table_name='close_friends') as has_close_friends,
  (select count(*) from pg_policies where tablename='close_friends') as policy_count;
```

Expected: `has_photo_url=1`, `has_close_friends=1`, `policy_count=3`.

- [ ] **Step 4: Commit**

```bash
git add db/2026-06-18-close-friends-and-photo.sql
git commit -m "feat(db): add close_friends table and profiles.photo_url"
```

---

### Task 4: `useNetworkMembers` hook — list pharmacies in my networks

**Files:**
- Create: `src/hooks/useNetworkMembers.js`
- Test: `src/hooks/useNetworkMembers.test.js`

**Interfaces:**
- Consumes: `supabase`, `useAuthStore().session`.
- Produces: `useNetworkMembers()` → `{ members, loading, error }` where each member is `{ id, pharmacy_name, city, country, photo_url }` (deduped across networks, excludes self).

- [ ] **Step 1: Write the failing test**

```js
// src/hooks/useNetworkMembers.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

vi.mock('../lib/supabase', () => ({ supabase: { from: vi.fn() } }))
vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({ session: { user: { id: 'me' } } }),
}))

import { supabase } from '../lib/supabase'
import { useNetworkMembers } from './useNetworkMembers'

function mockMembers(rows) {
  supabase.from.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => resolve({ data: rows, error: null })),
  })
}

describe('useNetworkMembers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns deduped members excluding self', async () => {
    mockMembers([
      { profile: { id: 'a', pharmacy_name: 'A', city: 'بغداد', country: 'IQ', photo_url: null } },
      { profile: { id: 'a', pharmacy_name: 'A', city: 'بغداد', country: 'IQ', photo_url: null } },
      { profile: { id: 'me', pharmacy_name: 'Me', city: 'بغداد', country: 'IQ', photo_url: null } },
      { profile: { id: 'b', pharmacy_name: 'B', city: 'البصرة', country: 'IQ', photo_url: null } },
    ])
    const { result } = renderHook(() => useNetworkMembers())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.members.map((m) => m.id)).toEqual(['a', 'b'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/useNetworkMembers.test.js`
Expected: FAIL — `Cannot find module './useNetworkMembers'`.

- [ ] **Step 3: Implement the hook**

```js
// src/hooks/useNetworkMembers.js
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export function useNetworkMembers() {
  const { session } = useAuthStore()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session) return
    let cancelled = false
    async function load() {
      // network ids I belong to
      const { data: mine, error: e1 } = await supabase
        .from('network_members')
        .select('network_id')
        .eq('profile_id', session.user.id)
        .eq('status', 'active')
      if (e1) { if (!cancelled) { setError(e1.message); setLoading(false) }; return }
      const networkIds = (mine ?? []).map((m) => m.network_id)
      if (networkIds.length === 0) {
        if (!cancelled) { setMembers([]); setLoading(false) }
        return
      }
      // all active members of those networks + their profiles
      const { data, error: e2 } = await supabase
        .from('network_members')
        .select('profile:profiles(id, pharmacy_name, city, country, photo_url)')
        .in('network_id', networkIds)
        .eq('status', 'active')
      if (cancelled) return
      if (e2) { setError(e2.message); setLoading(false); return }
      const seen = new Set()
      const deduped = []
      for (const row of data ?? []) {
        const p = row.profile
        if (!p || p.id === session.user.id || seen.has(p.id)) continue
        seen.add(p.id)
        deduped.push(p)
      }
      setMembers(deduped)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [session])

  return { members, loading, error }
}
```

Note: the test mock returns a chainable whose terminal `then` resolves to the SECOND query's shape. Because the first query (`mine`) also resolves to the same mock, give it the network rows too — adjust the test mock if the first call needs a distinct shape. To keep the test simple, the mock's `then` returns the member rows for both calls; `.map((m) => m.network_id)` on member rows yields `undefined`s, so **the test must mock the two calls separately**. Update Step 1's `mockMembers` to:

```js
function mockMembers(memberRows) {
  let call = 0
  supabase.from.mockImplementation(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => {
      call += 1
      if (call === 1) return resolve({ data: [{ network_id: 'n1' }], error: null })
      return resolve({ data: memberRows, error: null })
    }),
  }))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/hooks/useNetworkMembers.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useNetworkMembers.js src/hooks/useNetworkMembers.test.js
git commit -m "feat: useNetworkMembers hook lists pharmacies across my networks"
```

---

### Task 5: `useCloseFriends` hook — list/add/remove favorites

**Files:**
- Create: `src/hooks/useCloseFriends.js`
- Test: `src/hooks/useCloseFriends.test.js`

**Interfaces:**
- Consumes: `supabase`, `useAuthStore().session`.
- Produces: `useCloseFriends()` → `{ friends, friendIds, loading, error, add(friendProfileId), remove(friendProfileId) }`. `friends` = array of `{ id, pharmacy_name, city, country, photo_url }`. `friendIds` = array of profile id strings.

- [ ] **Step 1: Write the failing test**

```js
// src/hooks/useCloseFriends.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

const calls = []
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({
        data: [{ friend: { id: 'a', pharmacy_name: 'A', city: 'بغداد', country: 'IQ', photo_url: null } }],
        error: null,
      })),
      insert: vi.fn((row) => { calls.push(['insert', row]); return Promise.resolve({ error: null }) }),
      delete: vi.fn(() => ({
        eq: vi.fn().mockReturnThis(),
        match: vi.fn((m) => { calls.push(['delete', m]); return Promise.resolve({ error: null }) }),
      })),
    })),
  },
}))
vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({ session: { user: { id: 'me' } } }),
}))

import { useCloseFriends } from './useCloseFriends'

describe('useCloseFriends', () => {
  beforeEach(() => { calls.length = 0 })

  it('lists friends and exposes friendIds', async () => {
    const { result } = renderHook(() => useCloseFriends())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.friends).toHaveLength(1)
    expect(result.current.friendIds).toEqual(['a'])
  })

  it('add() inserts a row with owner and friend ids', async () => {
    const { result } = renderHook(() => useCloseFriends())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.add('b') })
    expect(calls).toContainEqual(['insert', { owner_id: 'me', friend_profile_id: 'b' }])
  })

  it('remove() deletes the matching row', async () => {
    const { result } = renderHook(() => useCloseFriends())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.remove('a') })
    expect(calls).toContainEqual(['delete', { owner_id: 'me', friend_profile_id: 'a' }])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/useCloseFriends.test.js`
Expected: FAIL — `Cannot find module './useCloseFriends'`.

- [ ] **Step 3: Implement the hook**

```js
// src/hooks/useCloseFriends.js
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export function useCloseFriends() {
  const { session } = useAuthStore()
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!session) return
    setLoading(true)
    const { data, error: e } = await supabase
      .from('close_friends')
      .select('friend:profiles!close_friends_friend_profile_id_fkey(id, pharmacy_name, city, country, photo_url)')
      .eq('owner_id', session.user.id)
    if (e) setError(e.message)
    setFriends((data ?? []).map((r) => r.friend).filter(Boolean))
    setLoading(false)
  }, [session])

  useEffect(() => { load() }, [load])

  const add = useCallback(async (friendProfileId) => {
    if (!session) return
    const { error: e } = await supabase
      .from('close_friends')
      .insert({ owner_id: session.user.id, friend_profile_id: friendProfileId })
    if (e) { setError(e.message); return }
    await load()
  }, [session, load])

  const remove = useCallback(async (friendProfileId) => {
    if (!session) return
    const { error: e } = await supabase
      .from('close_friends')
      .delete()
      .match({ owner_id: session.user.id, friend_profile_id: friendProfileId })
    if (e) { setError(e.message); return }
    await load()
  }, [session, load])

  return {
    friends,
    friendIds: friends.map((f) => f.id),
    loading,
    error,
    add,
    remove,
  }
}
```

Note: the select uses the explicit FK name `close_friends_friend_profile_id_fkey` so PostgREST resolves the join to the friend (not the owner). If the auto-generated constraint name differs, confirm it from the Task 3 migration (`select conname from pg_constraint where conrelid='public.close_friends'::regclass`) and use that exact name.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/hooks/useCloseFriends.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCloseFriends.js src/hooks/useCloseFriends.test.js
git commit -m "feat: useCloseFriends hook for private pharmacy favorites"
```

---

### Task 6: Close-friends section + picker in Networks.jsx

**Files:**
- Create: `src/pages/Networks/CloseFriends.jsx` (section + picker modal + demo cards)
- Create: `src/pages/Networks/CloseFriends.test.jsx`
- Modify: `src/pages/Networks/Networks.jsx` (render `<CloseFriends />` above the networks list)

**Interfaces:**
- Consumes: `useCloseFriends`, `useNetworkMembers`, `useNavigate`.
- Produces: `<CloseFriends />` default export (no props).

- [ ] **Step 1: Write the failing test**

```jsx
// src/pages/Networks/CloseFriends.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

const add = vi.fn()
const remove = vi.fn()
vi.mock('../../hooks/useCloseFriends', () => ({
  useCloseFriends: () => ({ friends: [], friendIds: [], loading: false, error: '', add, remove }),
}))
vi.mock('../../hooks/useNetworkMembers', () => ({
  useNetworkMembers: () => ({
    members: [{ id: 'a', pharmacy_name: 'صيدلية أ', city: 'بغداد', country: 'IQ', photo_url: null }],
    loading: false, error: '',
  }),
}))
const navigate = vi.fn()
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))

import CloseFriends from './CloseFriends'

describe('CloseFriends', () => {
  it('shows demo placeholder cards labelled مثال when empty', () => {
    render(<CloseFriends />)
    expect(screen.getByText('الأصدقاء المقرّبون')).toBeInTheDocument()
    expect(screen.getAllByText('مثال').length).toBeGreaterThan(0)
  })

  it('opens picker and adds a member', () => {
    render(<CloseFriends />)
    fireEvent.click(screen.getByRole('button', { name: '＋ إضافة' }))
    fireEvent.click(screen.getByText('صيدلية أ'))
    expect(add).toHaveBeenCalledWith('a')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/Networks/CloseFriends.test.jsx`
Expected: FAIL — `Cannot find module './CloseFriends'`.

- [ ] **Step 3: Implement the component**

```jsx
// src/pages/Networks/CloseFriends.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCloseFriends } from '../../hooks/useCloseFriends'
import { useNetworkMembers } from '../../hooks/useNetworkMembers'

const DEMO_FRIENDS = [
  { id: 'demo-a', pharmacy_name: 'صيدلية الرافدين', city: 'بغداد' },
  { id: 'demo-b', pharmacy_name: 'صيدلية الأمل', city: 'البصرة' },
]

function Avatar({ pharmacy_name, photo_url }) {
  if (photo_url) {
    return <img src={photo_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
  }
  return (
    <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold flex-shrink-0">
      {pharmacy_name?.[0] ?? '؟'}
    </div>
  )
}

export default function CloseFriends() {
  const navigate = useNavigate()
  const { friends, friendIds, add, remove } = useCloseFriends()
  const { members } = useNetworkMembers()
  const [picking, setPicking] = useState(false)

  return (
    <div className="px-4 pt-2 pb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-brand-text font-bold">الأصدقاء المقرّبون</h2>
        <div className="flex gap-3">
          {friends.length > 0 && (
            <button onClick={() => navigate('/feed?friends=1')} className="text-brand-primary text-sm font-medium">
              عروضهم
            </button>
          )}
          <button onClick={() => setPicking(true)} className="text-brand-primary text-sm font-medium">
            ＋ إضافة
          </button>
        </div>
      </div>

      {friends.length === 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-brand-muted text-xs mb-1">اختر صيدليات من شبكتك لمتابعة عروضهم أولاً</p>
          {DEMO_FRIENDS.map((d) => (
            <div key={d.id} className="bg-brand-card border border-brand-border rounded-xl p-3 flex items-center gap-3 opacity-50">
              <Avatar pharmacy_name={d.pharmacy_name} />
              <div className="flex-1">
                <p className="text-brand-text text-sm font-medium">{d.pharmacy_name}</p>
                <p className="text-brand-muted text-xs">{d.city}</p>
              </div>
              <span className="text-[10px] text-brand-muted border border-brand-border px-2 py-0.5 rounded-full">مثال</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {friends.map((f) => (
            <div key={f.id} className="bg-brand-card border border-brand-border rounded-xl p-3 flex items-center gap-3">
              <Avatar pharmacy_name={f.pharmacy_name} photo_url={f.photo_url} />
              <div className="flex-1">
                <p className="text-brand-text text-sm font-medium">{f.pharmacy_name}</p>
                <p className="text-brand-muted text-xs">{f.city}</p>
              </div>
              <button onClick={() => remove(f.id)} className="text-brand-muted text-xs" aria-label={`إزالة ${f.pharmacy_name}`}>
                إزالة
              </button>
            </div>
          ))}
        </div>
      )}

      {picking && (
        <div className="fixed inset-0 bg-black/40 z-20 flex items-end" onClick={() => setPicking(false)}>
          <div className="bg-brand-bg w-full rounded-t-2xl max-h-[70vh] overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-brand-text font-bold">إضافة صديق مقرّب</h3>
              <button onClick={() => setPicking(false)} className="text-brand-muted text-sm">إغلاق</button>
            </div>
            {members.length === 0 && (
              <p className="text-brand-muted text-sm py-6 text-center">لا يوجد أعضاء في شبكتك بعد</p>
            )}
            <div className="flex flex-col gap-2">
              {members.map((m) => {
                const added = friendIds.includes(m.id)
                return (
                  <button
                    key={m.id}
                    onClick={() => (added ? remove(m.id) : add(m.id))}
                    className="bg-brand-card border border-brand-border rounded-xl p-3 flex items-center gap-3 text-right"
                  >
                    <Avatar pharmacy_name={m.pharmacy_name} photo_url={m.photo_url} />
                    <div className="flex-1">
                      <p className="text-brand-text text-sm font-medium">{m.pharmacy_name}</p>
                      <p className="text-brand-muted text-xs">{m.city}</p>
                    </div>
                    <span className={`text-xs font-medium ${added ? 'text-brand-muted' : 'text-brand-primary'}`}>
                      {added ? '✓ مضاف' : '＋'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/Networks/CloseFriends.test.jsx`
Expected: PASS

- [ ] **Step 5: Mount it in Networks.jsx**

In `src/pages/Networks/Networks.jsx`, add the import and render the section after the header `</div>` (line 24) and before the `{networks.length === 0 ...}` block:

```jsx
import CloseFriends from './CloseFriends'
```

```jsx
      <CloseFriends />
```

- [ ] **Step 6: Run full suite**

Run: `npm test`
Expected: all tests pass (existing `Networks.test.jsx` still green — `CloseFriends` mocks its own hooks; if `Networks.test.jsx` renders the real child, add `vi.mock('./CloseFriends', () => ({ default: () => null }))` to that test).

- [ ] **Step 7: Commit**

```bash
git add src/pages/Networks/CloseFriends.jsx src/pages/Networks/CloseFriends.test.jsx src/pages/Networks/Networks.jsx src/pages/Networks/Networks.test.jsx
git commit -m "feat: close-friends section with member picker and demo cards"
```

---

### Task 7: `?friends=1` feed filter

**Files:**
- Modify: `src/hooks/useFeed.js` (accept `friendIds`, filter query)
- Modify: `src/pages/Feed/Feed.jsx` (read query param, pass `friendIds`)
- Test: `src/hooks/useFeed.test.js` (add cases)

**Interfaces:**
- Consumes: `useCloseFriends().friendIds`.
- Produces: `useFeed({ ..., friendIds })` — when `friendIds` is a non-empty array, the query adds `.in('author_id', friendIds)`. When it is an empty array AND the friends filter is requested, returns no posts.

- [ ] **Step 1: Write the failing tests (append to useFeed.test.js)**

Add `in: vi.fn().mockReturnThis()` to the `makeQueryMock` chain, then add:

```js
  it('filters to close friends when friendIds provided', async () => {
    const chain = makeQueryMock(mockPosts)
    const { result } = renderHook(() => useFeed({ networkId: NETWORK_ID, friendIds: ['u1'] }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(chain.in).toHaveBeenCalledWith('author_id', ['u1'])
  })

  it('returns no posts when friendIds is an empty array', async () => {
    makeQueryMock(mockPosts)
    const { result } = renderHook(() => useFeed({ networkId: NETWORK_ID, friendIds: [] }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.posts).toHaveLength(0)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/hooks/useFeed.test.js`
Expected: FAIL — `chain.in` not called / posts not empty (param unsupported).

- [ ] **Step 3: Implement in useFeed.js**

Add `friendIds = null` to the destructured params (line 6). After the `search` filter line (after line 24) add:

```js
      if (friendIds) {
        if (friendIds.length === 0) {
          setPosts([])
          setLoading(false)
          return
        }
        query = query.in('author_id', friendIds)
      }
```

Add `friendIds` to the `useCallback` dependency array (line 56). Because `friendIds` is an array (new identity each render), the caller must memoize it — note this for Step 5.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/hooks/useFeed.test.js`
Expected: PASS

- [ ] **Step 5: Wire the param in Feed.jsx**

In `src/pages/Feed/Feed.jsx`:

```jsx
import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCloseFriends } from '../../hooks/useCloseFriends'
```

Inside `Feed()`, after `const navigate = useNavigate()`:

```jsx
  const [searchParams] = useSearchParams()
  const friendsMode = searchParams.get('friends') === '1'
  const { friendIds: rawFriendIds } = useCloseFriends()
  const friendIds = useMemo(
    () => (friendsMode ? rawFriendIds : null),
    [friendsMode, rawFriendIds.join(',')]
  )
```

Pass `friendIds` into the `useFeed({ ... })` call (add `friendIds,`). Then show a friends-mode header by adding, just inside the main return's outer `<div>` (after `<LocationNudge />`):

```jsx
      {friendsMode && (
        <div className="px-4 pt-3">
          <p className="text-brand-text text-sm font-medium">عروض الأصدقاء المقرّبين</p>
          <button onClick={() => navigate('/feed')} className="text-brand-primary text-xs">عرض كل العروض</button>
        </div>
      )}
```

- [ ] **Step 6: Run full suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useFeed.js src/hooks/useFeed.test.js src/pages/Feed/Feed.jsx
git commit -m "feat: filter feed to close friends via ?friends=1"
```

---

### Task 8: Pharmacy photo in onboarding ProfileStep

**Files:**
- Modify: `src/pages/Onboarding/ProfileStep.jsx` (optional photo picker + preview)
- Test: `src/pages/Onboarding/ProfileStep.test.jsx` (add a case; keep existing exact-match tests green)

**Interfaces:**
- Produces: `ProfileStep.onNext(payload)` — payload is unchanged when no photo is chosen; includes an extra `photo_file: File` key ONLY when the user selects a photo. (Conditional inclusion keeps the existing exact-match tests valid.)

- [ ] **Step 1: Write the failing test (append to ProfileStep.test.jsx)**

```jsx
  it('includes photo_file in payload only when a photo is selected', () => {
    const onNext = vi.fn()
    render(<ProfileStep onNext={onNext} />)
    fireEvent.change(screen.getByPlaceholderText('اسم الصيدلية'), { target: { value: 'صيدلية النور' } })
    fireEvent.change(screen.getByPlaceholderText('اسم المالك'), { target: { value: 'أحمد' } })
    fireEvent.change(screen.getByPlaceholderText('رقم الواتساب'), { target: { value: '0791234567' } })
    fireEvent.change(screen.getByPlaceholderText('المدينة'), { target: { value: 'بغداد' } })
    const file = new File(['x'], 'shop.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText('صورة الصيدلية'), { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'التالي' }))
    expect(onNext).toHaveBeenCalledWith(expect.objectContaining({ photo_file: file }))
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/Onboarding/ProfileStep.test.jsx`
Expected: FAIL — no `صورة الصيدلية` input exists.

- [ ] **Step 3: Implement the photo picker**

In `src/pages/Onboarding/ProfileStep.jsx`, add to imports/state:

```jsx
import { useState, useRef, useMemo, useEffect } from 'react'
```

Inside the component, add:

```jsx
  const [photoFile, setPhotoFile] = useState(null)
  const photoInputRef = useRef(null)
  const photoPreview = useMemo(() => (photoFile ? URL.createObjectURL(photoFile) : null), [photoFile])
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }, [photoPreview])
```

In `handleSubmit`, build the payload conditionally:

```jsx
    const payload = {
      ...form,
      pharmacy_name: form.pharmacy_name.trim(),
      owner_name: form.owner_name.trim(),
      phone: form.phone.trim(),
      city: form.city.trim(),
    }
    if (photoFile) payload.photo_file = photoFile
    onNext(payload)
```

Add the picker UI at the top of the `<form>` (before the pharmacy_name input):

```jsx
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          className="self-center w-20 h-20 rounded-full border-2 border-dashed border-brand-border flex items-center justify-center overflow-hidden"
        >
          {photoPreview
            ? <img src={photoPreview} alt="" className="w-full h-full object-cover" />
            : <span className="text-brand-muted text-xs text-center">صورة<br/>الصيدلية</span>}
        </button>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
          className="hidden"
          aria-label="صورة الصيدلية"
        />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/Onboarding/ProfileStep.test.jsx`
Expected: PASS — and the existing exact-match tests (no photo) still pass because `photo_file` is omitted when no photo is chosen.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Onboarding/ProfileStep.jsx src/pages/Onboarding/ProfileStep.test.jsx
git commit -m "feat: optional pharmacy photo picker in onboarding profile step"
```

---

### Task 9: Upload the onboarding photo on save

**Files:**
- Modify: `src/pages/Onboarding/Onboarding.jsx:44-68` (`handleLocationNext`)

**Interfaces:**
- Consumes: `profileData.photo_file` (from Task 8), `compressImage`, `uploadMedia`.
- Produces: saved profile includes `photo_url` when a photo was chosen; `photo_file` is never persisted to the DB.

- [ ] **Step 1: Add the upload to handleLocationNext**

In `src/pages/Onboarding/Onboarding.jsx`, add the import:

```jsx
import { compressImage, uploadMedia } from '../../lib/mediaUtils'
```

Replace the body of `handleLocationNext` between `if (error || !user) ...` and `await saveProfile(...)`:

```jsx
      const { photo_file, ...rest } = profileData ?? {}
      const merged = { ...rest, ...locationData }
      if (photo_file) {
        const blob = await compressImage(photo_file)
        merged.photo_url = await uploadMedia(
          supabase, 'post-media', `pharmacy/${user.id}.jpg`, blob, 'image/jpeg'
        )
      }
      await saveProfile(user.id, merged)
      setProfile(merged)
```

(Remove the old `const merged = { ...profileData, ...locationData }` line so `photo_file` is stripped.)

- [ ] **Step 2: Run full suite**

Run: `npm test`
Expected: all tests pass (no onboarding integration test asserts on photo; existing tests unaffected).

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, complete onboarding with a photo, and confirm in Supabase that the new `profiles` row has a `photo_url` pointing at `post-media/pharmacy/<id>.jpg` and the image loads.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Onboarding/Onboarding.jsx
git commit -m "feat: upload pharmacy photo during onboarding and save photo_url"
```

---

### Task 10: Photo in Profile screen (display + edit)

**Files:**
- Modify: `src/pages/Profile/Profile.jsx`
- Test: `src/pages/Profile/Profile.test.jsx` (add a display case)

**Interfaces:**
- Consumes: `profile.photo_url`, `compressImage`, `uploadMedia`.
- Produces: avatar renders `photo_url` when present; edit mode allows replacing it (uploads to `pharmacy/{id}.jpg`, updates `photo_url`).

- [ ] **Step 1: Write the failing test (append to Profile.test.jsx)**

```jsx
  it('renders the pharmacy photo when photo_url is present', () => {
    // arrange a profile with photo_url in the store mock used by this suite,
    // then assert an <img> with that src renders inside the avatar block.
    // (Match the store-mocking style already used at the top of this file.)
    // Example assertion:
    // expect(screen.getByRole('img')).toHaveAttribute('src', 'https://x/pharmacy/u1.jpg')
  })
```

If `Profile.test.jsx` does not yet mock `useAuthStore`, mirror the mocking approach from `useFeed.test.js`/`useNetworkMembers.test.js` (mock `../../store/authStore` to return a profile with `photo_url: 'https://x/pharmacy/u1.jpg'`). Replace the comment body with the concrete arrange/assert once the suite's existing mock style is in view.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/Profile/Profile.test.jsx`
Expected: FAIL — avatar always renders the initial letter, no `<img>`.

- [ ] **Step 3: Implement display + edit upload**

Add imports:

```jsx
import { useState, useRef } from 'react'
import { compressImage, uploadMedia } from '../../lib/mediaUtils'
```

Add state + handler:

```jsx
  const photoInputRef = useRef(null)
  const [photoUploading, setPhotoUploading] = useState(false)

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoUploading(true)
    setError('')
    try {
      const blob = await compressImage(file)
      const url = await uploadMedia(supabase, 'post-media', `pharmacy/${profile.id}.jpg`, blob, 'image/jpeg')
      const bust = `${url}?t=${Date.now()}`
      const { error: e2 } = await supabase.from('profiles').update({ photo_url: url }).eq('id', profile.id)
      if (e2) throw e2
      setProfile({ ...profile, photo_url: bust })
    } catch (err) {
      setError(err?.message ?? 'تعذر رفع الصورة')
    } finally {
      setPhotoUploading(false)
    }
  }
```

Replace the avatar block (lines 70-72) so it renders the photo when present and, in edit mode, is tappable:

```jsx
          <button
            type="button"
            onClick={() => editing && photoInputRef.current?.click()}
            className="w-14 h-14 rounded-full bg-brand-primary flex items-center justify-center text-white text-xl font-bold flex-shrink-0 overflow-hidden relative"
          >
            {profile.photo_url
              ? <img src={profile.photo_url} alt="" className="w-full h-full object-cover" />
              : (profile.pharmacy_name?.[0] ?? '؟')}
            {editing && (
              <span className="absolute inset-0 bg-black/30 flex items-center justify-center text-xs">
                {photoUploading ? '...' : '📷'}
              </span>
            )}
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhoto}
            className="hidden"
            aria-label="صورة الصيدلية"
          />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/Profile/Profile.test.jsx`
Expected: PASS

- [ ] **Step 5: Run full suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Profile/Profile.jsx src/pages/Profile/Profile.test.jsx
git commit -m "feat: display and edit pharmacy photo on profile screen"
```

---

### Task 11: Build, deploy, smoke test

**Files:** none (release task).

- [ ] **Step 1: Full test + build**

Run: `npm test && npm run build`
Expected: all tests pass; build succeeds.

- [ ] **Step 2: Deploy**

Run: `netlify deploy --prod --dir dist`
Expected: deploy succeeds; live at dawwar-pharma.netlify.app.

- [ ] **Step 3: Smoke test on the live link**

- Open the link logged-in: app enters without a long spinner (Task 1).
- شبكاتي shows الأصدقاء المقرّبون with demo "مثال" cards; add a member; "عروضهم" opens the filtered feed.
- Profile screen shows/edits the pharmacy photo; onboarding a fresh number with a photo saves it.

- [ ] **Step 4: Commit any config/notes if changed** (otherwise skip).

---

## Self-review

- **Spec coverage:** Speed Fix A → Task 1; Fix B → Task 2; close_friends table + RLS + photo_url column → Task 3; member source → Task 4; close-friends hook → Task 5; Networks section + picker + demo cards → Task 6; `?friends=1` filter → Task 7; photo storage/flow → Tasks 8-10; testing + deploy → Task 11. All spec sections mapped.
- **Type consistency:** `friendIds` (string[]) produced by Task 5, consumed by Tasks 6 & 7; `photo_file` (File) produced by Task 8, consumed by Task 9; `photo_url` (string) written in Tasks 9/10, read in Tasks 6/10. `add`/`remove` signatures match across Tasks 5/6. Bucket `post-media` and column `author_id` consistent throughout.
- **Placeholder note:** Task 10 Step 1 intentionally defers the concrete assertion to the implementer because `Profile.test.jsx`'s existing store-mock style must be read first; the arrange/assert pattern and exact expectation are specified. All other steps contain complete code.
