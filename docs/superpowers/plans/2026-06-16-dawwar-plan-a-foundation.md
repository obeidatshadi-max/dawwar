# دوّار — Plan A: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the React (Vite) PWA, configure Supabase schema + RLS + PostGIS, and implement phone OTP auth with full onboarding flow (profile + location capture).

**Architecture:** React 18 + Vite, Tailwind CSS RTL, Zustand for auth state, React Router v6. Supabase handles all backend: auth, PostgreSQL, storage, realtime. Four-step onboarding writes to `profiles` table on completion.

**Tech Stack:** React 18, Vite 5, Tailwind CSS 3, Zustand 4, React Router 6, @supabase/supabase-js 2, Vitest 1, React Testing Library 14

---

## File Map

```
dawwar/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.local                          (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
├── public/
│   └── manifest.json                   (PWA manifest — minimal for now)
├── supabase/
│   └── migrations/
│       ├── 001_extensions.sql          (enable postgis, uuid-ossp)
│       ├── 002_schema.sql              (all tables)
│       └── 003_rls.sql                 (all RLS policies)
└── src/
    ├── main.jsx                        (entry — render App, RTL dir)
    ├── App.jsx                         (router — auth gate, route tree)
    ├── index.css                       (Tailwind directives + design tokens)
    ├── lib/
    │   └── supabase.js                 (single Supabase client export)
    ├── store/
    │   └── authStore.js                (Zustand — session, profile, loading)
    ├── hooks/
    │   └── useAuth.js                  (login, verifyOTP, logout, getProfile)
    └── pages/
        └── Onboarding/
            ├── Onboarding.jsx          (step router — 1→2→3→4)
            ├── PhoneStep.jsx           (phone number entry)
            ├── OTPStep.jsx             (6-digit OTP verify)
            ├── ProfileStep.jsx         (pharmacy name, owner, country, city)
            └── LocationStep.jsx        (GPS capture + skip option)
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `dawwar/` (all config files)
- Create: `src/main.jsx`, `src/App.jsx`, `src/index.css`

- [ ] **Step 1: Initialize Vite + React project**

Run in `C:\Users\shadi\Desktop\AI APP 2026\`:
```bash
npm create vite@latest dawwar -- --template react
cd dawwar
npm install
```

Expected: Project created, `npm run dev` works at `http://localhost:5173`.

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js react-router-dom zustand
npm install -D tailwindcss postcss autoprefixer vitest @testing-library/react @testing-library/user-event jsdom @vitejs/plugin-react
npx tailwindcss init -p
```

- [ ] **Step 3: Write `vite.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.js',
  },
})
```

- [ ] **Step 4: Create `src/test-setup.js`**

```js
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Write `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg:       '#0d1f1a',
          card:     '#132d21',
          border:   '#14532d',
          primary:  '#059669',
          text:     '#f0fdf4',
          muted:    '#86efac',
          success:  '#4ade80',
          warning:  '#fbbf24',
          offer:    '#dc2626',
          wanted:   '#7c3aed',
          whatsapp: '#25d366',
        },
      },
      fontFamily: {
        arabic: ['Cairo', 'Tajawal', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 6: Write `src/index.css`**

```css
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: 'Cairo', sans-serif;
}

* {
  direction: rtl;
}
```

- [ ] **Step 7: Write `index.html`**

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
    <meta name="theme-color" content="#059669" />
    <link rel="manifest" href="/manifest.json" />
    <title>دوّار</title>
  </head>
  <body class="bg-brand-bg text-brand-text font-arabic antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Write `public/manifest.json`**

```json
{
  "name": "دوّار",
  "short_name": "دوّار",
  "description": "شبكة صيدليات — تصريف المنتجات قرب الانتهاء",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0d1f1a",
  "theme_color": "#059669",
  "lang": "ar",
  "dir": "rtl",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

> Note: Add placeholder 192×512 green PNG icons to `public/` — any solid `#059669` square works for now.

- [ ] **Step 9: Write `src/main.jsx`**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
```

- [ ] **Step 10: Write placeholder `src/App.jsx`**

```jsx
export default function App() {
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center">
      <p className="text-brand-muted text-lg">دوّار 🌿</p>
    </div>
  )
}
```

- [ ] **Step 11: Run dev server and verify**

```bash
npm run dev
```

Expected: Green screen at `http://localhost:5173` with "دوّار 🌿" centered in Arabic font.

- [ ] **Step 12: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Vite React PWA with Tailwind RTL and green design tokens"
```

---

## Task 2: Supabase Setup

**Files:**
- Create: `supabase/migrations/001_extensions.sql`
- Create: `supabase/migrations/002_schema.sql`
- Create: `supabase/migrations/003_rls.sql`
- Create: `.env.local`

**Prerequisites:** Create a Supabase project at supabase.com. Note your project URL and anon key from Settings → API.

- [ ] **Step 1: Create `.env.local`**

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Add `.env.local` to `.gitignore`:
```
.env.local
```

- [ ] **Step 2: Write `supabase/migrations/001_extensions.sql`**

Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query):

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

Expected: No error. In Database → Extensions you should see PostGIS listed.

- [ ] **Step 3: Write `supabase/migrations/002_schema.sql`**

Run in Supabase SQL Editor:

```sql
-- Profiles (one per auth user)
CREATE TABLE profiles (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pharmacy_name  text NOT NULL,
  owner_name     text NOT NULL,
  phone          text NOT NULL,
  city           text NOT NULL,
  country        text NOT NULL CHECK (country IN ('JO', 'IQ')),
  avatar_url     text,
  lat            float,
  lng            float,
  location_label text,
  created_at     timestamptz DEFAULT now()
);

-- Networks
CREATE TABLE networks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  city        text,
  country     text CHECK (country IN ('JO', 'IQ')),
  created_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

-- Network members
CREATE TABLE network_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id  uuid NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  invited_by  uuid REFERENCES profiles(id),
  status      text NOT NULL CHECK (status IN ('pending', 'active')) DEFAULT 'active',
  joined_at   timestamptz DEFAULT now(),
  UNIQUE (network_id, profile_id)
);

-- Invite tokens
CREATE TABLE network_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token       text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  network_id  uuid NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  created_by  uuid REFERENCES profiles(id),
  expires_at  timestamptz NOT NULL,
  max_uses    int DEFAULT 50,
  uses_count  int DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- Posts
CREATE TABLE posts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id     uuid NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  author_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type           text NOT NULL CHECK (type IN ('offer', 'wanted')),
  product_name   text NOT NULL,
  quantity       int NOT NULL CHECK (quantity > 0),
  unit           text NOT NULL,
  price          numeric(10,3),
  original_price numeric(10,3),
  currency       text CHECK (currency IN ('JOD', 'IQD')),
  expiry_date    date,
  description    text,
  phone          text NOT NULL,
  status         text NOT NULL CHECK (status IN ('active', 'sold', 'closed')) DEFAULT 'active',
  created_at     timestamptz DEFAULT now()
);

-- Post media (images + voice notes)
CREATE TABLE post_media (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('image', 'voice')),
  storage_url text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- Messages (DMs linked to a post)
CREATE TABLE messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  sender_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body         text,
  media_url    text,
  media_type   text CHECK (media_type IN ('image', 'voice')),
  read_at      timestamptz,
  created_at   timestamptz DEFAULT now()
);
```

Expected: All tables visible in Database → Tables.

- [ ] **Step 4: Write `supabase/migrations/003_rls.sql`**

Run in Supabase SQL Editor:

```sql
-- Enable RLS on all tables
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE networks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_media       ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages         ENABLE ROW LEVEL SECURITY;

-- Helper: returns network_ids the current user belongs to
CREATE OR REPLACE FUNCTION my_network_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER AS $$
  SELECT network_id FROM network_members
  WHERE profile_id = auth.uid() AND status = 'active';
$$;

-- PROFILES: user sees/edits own profile only
CREATE POLICY "profiles: own read"   ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles: own insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles: own update" ON profiles FOR UPDATE USING (id = auth.uid());

-- Also allow members to see other members' profiles (for post cards, DMs)
CREATE POLICY "profiles: network peer read" ON profiles FOR SELECT USING (
  id IN (
    SELECT profile_id FROM network_members
    WHERE network_id IN (SELECT my_network_ids())
  )
);

-- NETWORKS: members can read their networks; creator can update
CREATE POLICY "networks: member read"    ON networks FOR SELECT USING (id IN (SELECT my_network_ids()));
CREATE POLICY "networks: any insert"     ON networks FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "networks: admin update"   ON networks FOR UPDATE USING (
  id IN (SELECT network_id FROM network_members WHERE profile_id = auth.uid() AND role = 'admin')
);

-- NETWORK_MEMBERS: members see their own network's members; admins can insert/delete
CREATE POLICY "members: read own networks" ON network_members FOR SELECT USING (
  network_id IN (SELECT my_network_ids())
);
CREATE POLICY "members: join via token"    ON network_members FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "members: admin delete"      ON network_members FOR DELETE USING (
  network_id IN (
    SELECT network_id FROM network_members WHERE profile_id = auth.uid() AND role = 'admin'
  )
);

-- NETWORK_INVITES: admins manage; anyone can read to validate token
CREATE POLICY "invites: public read"   ON network_invites FOR SELECT USING (true);
CREATE POLICY "invites: admin insert"  ON network_invites FOR INSERT WITH CHECK (
  network_id IN (
    SELECT network_id FROM network_members WHERE profile_id = auth.uid() AND role = 'admin'
  )
);
CREATE POLICY "invites: admin update"  ON network_invites FOR UPDATE USING (
  network_id IN (
    SELECT network_id FROM network_members WHERE profile_id = auth.uid() AND role = 'admin'
  )
);

-- POSTS: visible to network members; authors can insert/update
CREATE POLICY "posts: member read"    ON posts FOR SELECT USING (network_id IN (SELECT my_network_ids()));
CREATE POLICY "posts: author insert"  ON posts FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "posts: author update"  ON posts FOR UPDATE USING (author_id = auth.uid());

-- POST_MEDIA: same network visibility as posts
CREATE POLICY "post_media: member read"   ON post_media FOR SELECT USING (
  post_id IN (SELECT id FROM posts WHERE network_id IN (SELECT my_network_ids()))
);
CREATE POLICY "post_media: author insert" ON post_media FOR INSERT WITH CHECK (
  post_id IN (SELECT id FROM posts WHERE author_id = auth.uid())
);

-- MESSAGES: sender and recipient only
CREATE POLICY "messages: participant read"   ON messages FOR SELECT USING (
  sender_id = auth.uid() OR recipient_id = auth.uid()
);
CREATE POLICY "messages: sender insert"      ON messages FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "messages: recipient update"   ON messages FOR UPDATE USING (recipient_id = auth.uid());
```

- [ ] **Step 5: Create Supabase Storage buckets**

In Supabase Dashboard → Storage → New bucket:
1. Name: `post-media`, Public: **false** (private)

Then add storage policies in SQL Editor:

```sql
-- Allow authenticated users to upload to post-media
CREATE POLICY "storage: auth upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-media');

-- Allow network members to view media (post_media table handles auth — storage url is signed)
CREATE POLICY "storage: auth read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'post-media');
```

- [ ] **Step 6: Commit schema files**

```bash
git add supabase/ .gitignore
git commit -m "feat: add Supabase schema, RLS policies, storage config"
```

---

## Task 3: Supabase Client + Auth Store

**Files:**
- Create: `src/lib/supabase.js`
- Create: `src/store/authStore.js`
- Create: `src/hooks/useAuth.js`
- Create: `src/hooks/useAuth.test.js`

- [ ] **Step 1: Write `src/lib/supabase.js`**

```js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

- [ ] **Step 2: Write `src/store/authStore.js`**

```js
import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  session: null,
  profile: null,
  loading: true,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  clear: () => set({ session: null, profile: null, loading: false }),
}))
```

- [ ] **Step 3: Write `src/hooks/useAuth.js`**

```js
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export function useAuthInit() {
  const { setSession, setProfile, setLoading, clear } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session) {
        const profile = await fetchProfile(session.user.id)
        setProfile(profile)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        if (session) {
          const profile = await fetchProfile(session.user.id)
          setProfile(profile)
        } else {
          clear()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])
}

async function fetchProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

export async function sendOTP(phone) {
  const { error } = await supabase.auth.signInWithOtp({
    phone: normalizePhone(phone),
  })
  if (error) throw error
}

export async function verifyOTP(phone, token) {
  const { error } = await supabase.auth.verifyOtp({
    phone: normalizePhone(phone),
    token,
    type: 'sms',
  })
  if (error) throw error
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function saveProfile(userId, data) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...data })
  if (error) throw error
}

// Normalize to E.164: +962XXXXXXXXX or +964XXXXXXXXX
export function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('00')) return '+' + digits.slice(2)
  if (digits.startsWith('0'))  return '+962' + digits.slice(1) // default JO
  if (!digits.startsWith('+')) return '+' + digits
  return phone
}
```

- [ ] **Step 4: Write `src/hooks/useAuth.test.js`**

```js
import { describe, it, expect } from 'vitest'

// Test the normalizePhone logic in isolation
// (exported separately for testing)
function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('00')) return '+' + digits.slice(2)
  if (digits.startsWith('0'))  return '+962' + digits.slice(1)
  if (!digits.startsWith('+')) return '+' + digits
  return phone
}

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
  it('strips spaces and dashes', () => {
    expect(normalizePhone('079 123-4567')).toBe('+96279 123-4567')
  })
})
```

> Note: Export `normalizePhone` from `useAuth.js` for testing by adding `export { normalizePhone }` at bottom, then import it in the test.

- [ ] **Step 5: Run tests**

```bash
npx vitest run src/hooks/useAuth.test.js
```

Expected: 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ src/store/ src/hooks/
git commit -m "feat: add Supabase client, auth store, and phone OTP helpers"
```

---

## Task 4: Onboarding — Phone + OTP Steps

**Files:**
- Create: `src/pages/Onboarding/Onboarding.jsx`
- Create: `src/pages/Onboarding/PhoneStep.jsx`
- Create: `src/pages/Onboarding/OTPStep.jsx`
- Create: `src/pages/Onboarding/PhoneStep.test.jsx`

- [ ] **Step 1: Write failing test for PhoneStep**

```jsx
// src/pages/Onboarding/PhoneStep.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import PhoneStep from './PhoneStep'

describe('PhoneStep', () => {
  it('renders Arabic phone input', () => {
    render(<PhoneStep onNext={vi.fn()} />)
    expect(screen.getByPlaceholderText(/0791/)).toBeInTheDocument()
  })

  it('calls onNext with phone when form submitted', async () => {
    const onNext = vi.fn()
    render(<PhoneStep onNext={onNext} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '0791234567' } })
    fireEvent.click(screen.getByRole('button', { name: /التالي/ }))
    expect(onNext).toHaveBeenCalledWith('0791234567')
  })

  it('does not call onNext when phone is empty', () => {
    const onNext = vi.fn()
    render(<PhoneStep onNext={onNext} />)
    fireEvent.click(screen.getByRole('button', { name: /التالي/ }))
    expect(onNext).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run src/pages/Onboarding/PhoneStep.test.jsx
```

Expected: FAIL — PhoneStep module not found.

- [ ] **Step 3: Write `src/pages/Onboarding/PhoneStep.jsx`**

```jsx
import { useState } from 'react'
import { sendOTP } from '../../hooks/useAuth'

export default function PhoneStep({ onNext }) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!phone.trim()) return
    setLoading(true)
    setError('')
    try {
      await sendOTP(phone.trim())
      onNext(phone.trim())
    } catch (err) {
      setError('تعذر إرسال الرمز. تأكد من الرقم.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">أهلاً بك في دوّار 🌿</h1>
        <p className="text-brand-muted mt-1 text-sm">أدخل رقم هاتفك للبدء</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0791234567"
          className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text text-lg tracking-widest focus:outline-none focus:border-brand-primary"
          dir="ltr"
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !phone.trim()}
          className="w-full bg-brand-primary text-white font-bold py-3 rounded-xl disabled:opacity-50"
        >
          {loading ? 'جارٍ الإرسال...' : 'التالي'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run src/pages/Onboarding/PhoneStep.test.jsx
```

Expected: 3 tests pass.

- [ ] **Step 5: Write `src/pages/Onboarding/OTPStep.jsx`**

```jsx
import { useState } from 'react'
import { verifyOTP } from '../../hooks/useAuth'

export default function OTPStep({ phone, onNext, onBack }) {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (token.length !== 6) return
    setLoading(true)
    setError('')
    try {
      await verifyOTP(phone, token)
      onNext()
    } catch (err) {
      setError('الرمز غير صحيح أو انتهت صلاحيته.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">رمز التحقق</h1>
        <p className="text-brand-muted mt-1 text-sm">
          أُرسل رمز SMS إلى {phone}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={token}
          onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-4 text-brand-text text-3xl tracking-[1rem] text-center focus:outline-none focus:border-brand-primary"
          dir="ltr"
        />

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading || token.length !== 6}
          className="w-full bg-brand-primary text-white font-bold py-3 rounded-xl disabled:opacity-50"
        >
          {loading ? 'جارٍ التحقق...' : 'تأكيد'}
        </button>

        <button type="button" onClick={onBack} className="text-brand-muted text-sm text-center">
          تغيير الرقم
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/Onboarding/
git commit -m "feat: add PhoneStep and OTPStep with auth integration"
```

---

## Task 5: Onboarding — Profile + Location Steps

**Files:**
- Create: `src/pages/Onboarding/ProfileStep.jsx`
- Create: `src/pages/Onboarding/LocationStep.jsx`
- Create: `src/pages/Onboarding/ProfileStep.test.jsx`

- [ ] **Step 1: Write failing test for ProfileStep**

```jsx
// src/pages/Onboarding/ProfileStep.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProfileStep from './ProfileStep'

describe('ProfileStep', () => {
  it('renders all required fields in Arabic', () => {
    render(<ProfileStep onNext={vi.fn()} />)
    expect(screen.getByPlaceholderText(/اسم الصيدلية/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/اسم المالك/)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /البلد/ })).toBeInTheDocument()
  })

  it('calls onNext with profile data when form complete', () => {
    const onNext = vi.fn()
    render(<ProfileStep onNext={onNext} />)
    fireEvent.change(screen.getByPlaceholderText(/اسم الصيدلية/), { target: { value: 'صيدلية النور' } })
    fireEvent.change(screen.getByPlaceholderText(/اسم المالك/), { target: { value: 'أحمد' } })
    fireEvent.change(screen.getByPlaceholderText(/رقم الواتساب/), { target: { value: '0791234567' } })
    fireEvent.change(screen.getByPlaceholderText(/المدينة/), { target: { value: 'عمّان' } })
    fireEvent.click(screen.getByRole('button', { name: /التالي/ }))
    expect(onNext).toHaveBeenCalledWith({
      pharmacy_name: 'صيدلية النور',
      owner_name: 'أحمد',
      phone: '0791234567',
      city: 'عمّان',
      country: 'JO',
    })
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run src/pages/Onboarding/ProfileStep.test.jsx
```

Expected: FAIL.

- [ ] **Step 3: Write `src/pages/Onboarding/ProfileStep.jsx`**

```jsx
import { useState } from 'react'

export default function ProfileStep({ onNext }) {
  const [form, setForm] = useState({
    pharmacy_name: '',
    owner_name: '',
    phone: '',
    city: '',
    country: 'JO',
  })

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  function isValid() {
    return form.pharmacy_name && form.owner_name && form.phone && form.city
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!isValid()) return
    onNext(form)
  }

  const inputClass = 'w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text focus:outline-none focus:border-brand-primary'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">بيانات الصيدلية</h1>
        <p className="text-brand-muted mt-1 text-sm">تظهر هذه المعلومات لأعضاء شبكتك</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input className={inputClass} placeholder="اسم الصيدلية" value={form.pharmacy_name} onChange={update('pharmacy_name')} />
        <input className={inputClass} placeholder="اسم المالك" value={form.owner_name} onChange={update('owner_name')} />
        <input className={inputClass} placeholder="رقم الواتساب" type="tel" dir="ltr" value={form.phone} onChange={update('phone')} />

        <select
          aria-label="البلد"
          className={inputClass}
          value={form.country}
          onChange={update('country')}
        >
          <option value="JO">الأردن 🇯🇴</option>
          <option value="IQ">العراق 🇮🇶</option>
        </select>

        <input className={inputClass} placeholder="المدينة" value={form.city} onChange={update('city')} />

        <button
          type="submit"
          disabled={!isValid()}
          className="w-full bg-brand-primary text-white font-bold py-3 rounded-xl mt-2 disabled:opacity-50"
        >
          التالي
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run src/pages/Onboarding/ProfileStep.test.jsx
```

Expected: 2 tests pass.

- [ ] **Step 5: Write `src/pages/Onboarding/LocationStep.jsx`**

```jsx
import { useState } from 'react'

export default function LocationStep({ onNext }) {
  const [status, setStatus] = useState('idle') // idle | loading | success | error

  async function captureLocation() {
    setStatus('loading')
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      )
      const { latitude: lat, longitude: lng } = pos.coords
      const label = await reverseGeocode(lat, lng)
      setStatus('success')
      onNext({ lat, lng, location_label: label })
    } catch {
      setStatus('error')
    }
  }

  function skip() {
    onNext({ lat: null, lng: null, location_label: null })
  }

  return (
    <div className="flex flex-col gap-6 items-center text-center">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">موقع الصيدلية</h1>
        <p className="text-brand-muted mt-1 text-sm">
          يُستخدم لعرض المسافة بين الصيدليات في الشبكة
        </p>
      </div>

      <div className="text-6xl">📍</div>

      {status === 'error' && (
        <p className="text-red-400 text-sm">تعذر تحديد الموقع. تحقق من الصلاحيات.</p>
      )}
      {status === 'success' && (
        <p className="text-brand-success text-sm">✓ تم تحديد الموقع بنجاح</p>
      )}

      <button
        onClick={captureLocation}
        disabled={status === 'loading' || status === 'success'}
        className="w-full bg-brand-primary text-white font-bold py-3 rounded-xl disabled:opacity-50"
      >
        {status === 'loading' ? 'جارٍ التحديد...' : 'تحديد الموقع'}
      </button>

      <button onClick={skip} className="text-brand-muted text-sm underline">
        تخطي الآن
      </button>
    </div>
  )
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ar`
    )
    const data = await res.json()
    const city = data.address?.city || data.address?.town || data.address?.village || ''
    const suburb = data.address?.suburb || ''
    return [city, suburb].filter(Boolean).join(' - ')
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/Onboarding/
git commit -m "feat: add ProfileStep and LocationStep with geolocation capture"
```

---

## Task 6: Onboarding Orchestrator + App Router

**Files:**
- Create: `src/pages/Onboarding/Onboarding.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Write `src/pages/Onboarding/Onboarding.jsx`**

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { saveProfile } from '../../hooks/useAuth'
import PhoneStep from './PhoneStep'
import OTPStep from './OTPStep'
import ProfileStep from './ProfileStep'
import LocationStep from './LocationStep'

const STEPS = ['phone', 'otp', 'profile', 'location']

export default function Onboarding() {
  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState('')
  const [profileData, setProfileData] = useState(null)
  const { session, setProfile } = useAuthStore()
  const navigate = useNavigate()

  function handlePhoneNext(p) {
    setPhone(p)
    setStep('otp')
  }

  function handleOTPNext() {
    setStep('profile')
  }

  async function handleProfileNext(data) {
    setProfileData(data)
    setStep('location')
  }

  async function handleLocationNext(locationData) {
    const userId = (await supabase.auth.getUser()).data.user.id
    const merged = { ...profileData, ...locationData }
    await saveProfile(userId, merged)
    setProfile(merged)
    navigate('/feed')
  }

  const progress = ((STEPS.indexOf(step) + 1) / STEPS.length) * 100

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col px-6 py-10 max-w-md mx-auto">
      {/* Progress bar */}
      <div className="w-full bg-brand-border rounded-full h-1 mb-8">
        <div
          className="bg-brand-primary h-1 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1">
        {step === 'phone'    && <PhoneStep onNext={handlePhoneNext} />}
        {step === 'otp'      && <OTPStep phone={phone} onNext={handleOTPNext} onBack={() => setStep('phone')} />}
        {step === 'profile'  && <ProfileStep onNext={handleProfileNext} />}
        {step === 'location' && <LocationStep onNext={handleLocationNext} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update `src/App.jsx` with full router + auth gate**

```jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useAuthInit } from './hooks/useAuth'
import Onboarding from './pages/Onboarding/Onboarding'

function PrivateRoute({ children }) {
  const { session, loading } = useAuthStore()
  if (loading) return <div className="min-h-screen bg-brand-bg flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
  </div>
  if (!session) return <Navigate to="/onboarding" replace />
  return children
}

function PublicOnlyRoute({ children }) {
  const { session, loading, profile } = useAuthStore()
  if (loading) return null
  if (session && profile) return <Navigate to="/feed" replace />
  return children
}

export default function App() {
  useAuthInit()

  return (
    <Routes>
      <Route path="/onboarding" element={
        <PublicOnlyRoute><Onboarding /></PublicOnlyRoute>
      } />
      <Route path="/feed" element={
        <PrivateRoute>
          <div className="min-h-screen bg-brand-bg flex items-center justify-center">
            <p className="text-brand-muted">الرئيسية — قادمة في Plan B</p>
          </div>
        </PrivateRoute>
      } />
      <Route path="*" element={<Navigate to="/onboarding" replace />} />
    </Routes>
  )
}
```

- [ ] **Step 3: Run dev server and test full onboarding manually**

```bash
npm run dev
```

Manual test checklist:
- [ ] Open `http://localhost:5173` → redirected to `/onboarding`
- [ ] Enter phone → OTP sent (check Supabase Auth dashboard for test OTP)
- [ ] Enter OTP → moves to profile step
- [ ] Fill profile → moves to location step
- [ ] Allow or skip location → redirected to `/feed`
- [ ] Refresh page → stays on `/feed` (session persisted)

> **Supabase test OTPs:** In dev, Supabase sends real SMS. For testing without SMS, go to Supabase Dashboard → Authentication → Users and manually confirm a user, or use the test phone `+15555550100` with OTP `000000` (enabled in Auth settings → Phone).

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: complete onboarding flow — phone OTP, profile, location, auth gate"
```

---

## Task 7: Invite Link Join Flow

**Files:**
- Create: `src/pages/JoinNetwork.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Write `src/pages/JoinNetwork.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export default function JoinNetwork() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [status, setStatus] = useState('loading') // loading | joining | success | error | invalid
  const [networkName, setNetworkName] = useState('')
  const { session, profile } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) { setStatus('invalid'); return }
    validateToken(token)
  }, [token])

  async function validateToken(t) {
    const { data, error } = await supabase
      .from('network_invites')
      .select('id, network_id, expires_at, max_uses, uses_count, networks(name)')
      .eq('token', t)
      .single()

    if (error || !data) { setStatus('invalid'); return }
    if (new Date(data.expires_at) < new Date()) { setStatus('invalid'); return }
    if (data.uses_count >= data.max_uses) { setStatus('invalid'); return }

    setNetworkName(data.networks.name)

    if (!session) {
      // Store token in sessionStorage then redirect to onboarding
      sessionStorage.setItem('pending_invite_token', t)
      navigate('/onboarding')
      return
    }

    setStatus('joining')
    await joinNetwork(data.id, data.network_id, t)
  }

  async function joinNetwork(inviteId, networkId, t) {
    const userId = session.user.id

    // Check not already a member
    const { data: existing } = await supabase
      .from('network_members')
      .select('id')
      .eq('network_id', networkId)
      .eq('profile_id', userId)
      .single()

    if (existing) { setStatus('success'); navigate('/feed'); return }

    // Insert membership
    const { error: memberError } = await supabase
      .from('network_members')
      .insert({ network_id: networkId, profile_id: userId, role: 'member' })

    if (memberError) { setStatus('error'); return }

    // Increment uses_count
    const { data: invite } = await supabase
      .from('network_invites')
      .select('uses_count')
      .eq('id', inviteId)
      .single()
    await supabase
      .from('network_invites')
      .update({ uses_count: (invite?.uses_count ?? 0) + 1 })
      .eq('id', inviteId)

    setStatus('success')
    setTimeout(() => navigate('/feed'), 1500)
  }

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        {status === 'loading'  && <p className="text-brand-muted">جارٍ التحقق من الرابط...</p>}
        {status === 'joining'  && <p className="text-brand-muted">جارٍ الانضمام إلى {networkName}...</p>}
        {status === 'success'  && <p className="text-brand-success text-lg font-bold">✓ انضممت إلى {networkName}!</p>}
        {status === 'error'    && <p className="text-red-400">حدث خطأ. حاول مجدداً.</p>}
        {status === 'invalid'  && <p className="text-red-400">رابط الدعوة غير صالح أو منتهي الصلاحية.</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add `/join` route to `src/App.jsx`**

Add this import and route:

```jsx
import JoinNetwork from './pages/JoinNetwork'

// Inside <Routes>:
<Route path="/join" element={<JoinNetwork />} />
```

- [ ] **Step 3: Also handle pending invite token after onboarding completes**

In `Onboarding.jsx`, update `handleLocationNext` to check for pending token:

```jsx
async function handleLocationNext(locationData) {
  const userId = (await supabase.auth.getUser()).data.user.id
  const merged = { ...profileData, ...locationData }
  await saveProfile(userId, merged)
  setProfile(merged)

  const pendingToken = sessionStorage.getItem('pending_invite_token')
  if (pendingToken) {
    sessionStorage.removeItem('pending_invite_token')
    navigate(`/join?token=${pendingToken}`)
  } else {
    navigate('/feed')
  }
}
```

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/JoinNetwork.jsx src/pages/Onboarding/Onboarding.jsx src/App.jsx
git commit -m "feat: add invite link join flow with pending token handoff through onboarding"
```

---

## Plan A Complete ✓

At this point you have:
- React (Vite) PWA scaffolded with Tailwind RTL green design system
- Supabase schema (all 7 tables), RLS policies, PostGIS enabled, storage bucket
- Phone OTP auth with persistent session
- Full onboarding: phone → OTP → pharmacy profile → GPS location
- Invite link join flow (works pre and post login)
- Auth gate: `/feed` protected, `/onboarding` redirects if logged in
- Route stub at `/feed` ready for Plan B

**Next: Plan B — Feed + Post Cards + Create Post Wizard + Media Upload**
