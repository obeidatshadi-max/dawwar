# دوّار — Pharmacy Network App Design Spec
**Date:** 2026-06-16  
**Status:** Approved

---

## Overview

**دوّار (Dawwar)** — a multi-tenant pharmacy cooperation network for Jordan and Iraq. Pharmacies post near-expiry product offers and product requests on a bulletin board feed. Invite-only networks. Arabic UI, green dark theme, mobile-first PWA.

**Core problem:** Pharmacies lose money on near-expiry stock. No existing tool in Jordan/Iraq enables direct peer-to-peer pharmacy exchange with images, voice notes, and geographic proximity filtering.

---

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React (Vite) PWA | Mobile-first, installable, consistent with existing apps |
| Styling | Tailwind CSS, RTL, Arabic | `dir="rtl"`, Cairo/Tajawal font |
| Backend | Supabase | Auth + PostgreSQL + Storage + Realtime in one |
| Geo queries | Supabase PostGIS extension | `ST_DWithin`, `ST_Distance` — no extra service |
| Deployment | Netlify | Consistent with existing apps |
| Media | Supabase Storage | Images compressed client-side (Canvas API), voice as webm/opus |

---

## Database Schema

### `profiles`
```sql
id           uuid PRIMARY KEY references auth.users
pharmacy_name text NOT NULL
owner_name   text NOT NULL
phone        text NOT NULL          -- WhatsApp number
city         text NOT NULL
country      text CHECK (country IN ('JO', 'IQ'))
avatar_url   text
lat          float
lng          float
location_label text                 -- e.g. "عمّان - الشميساني"
created_at   timestamptz DEFAULT now()
```

### `networks`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
name        text NOT NULL
description text
city        text
country     text CHECK (country IN ('JO', 'IQ'))
created_by  uuid references profiles(id)
created_at  timestamptz DEFAULT now()
```

### `network_members`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
network_id  uuid references networks(id) ON DELETE CASCADE
profile_id  uuid references profiles(id) ON DELETE CASCADE
role        text CHECK (role IN ('admin', 'member')) DEFAULT 'member'
invited_by  uuid references profiles(id)
status      text CHECK (status IN ('pending', 'active')) DEFAULT 'active'
joined_at   timestamptz DEFAULT now()
UNIQUE (network_id, profile_id)
```

### `network_invites`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
token       text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text
network_id  uuid references networks(id) ON DELETE CASCADE
created_by  uuid references profiles(id)
expires_at  timestamptz NOT NULL
max_uses    int DEFAULT 50
uses_count  int DEFAULT 0
created_at  timestamptz DEFAULT now()
```

### `posts`
```sql
id             uuid PRIMARY KEY DEFAULT gen_random_uuid()
network_id     uuid references networks(id) ON DELETE CASCADE
author_id      uuid references profiles(id)
type           text CHECK (type IN ('offer', 'wanted')) NOT NULL
product_name   text NOT NULL    -- English only (e.g. "Augmentin 625mg")
quantity       int NOT NULL
unit           text NOT NULL    -- علبة / شريط / أمبول / etc.
price          numeric(10,3)    -- selling price (JOD or IQD)
original_price numeric(10,3)    -- for auto discount % calc (offers only)
currency       text CHECK (currency IN ('JOD', 'IQD')) NOT NULL
expiry_date    date             -- required for offers
description    text
phone          text NOT NULL    -- WhatsApp number shown on post
status         text CHECK (status IN ('active', 'sold', 'closed')) DEFAULT 'active'
created_at     timestamptz DEFAULT now()
```

### `post_media`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
post_id     uuid references posts(id) ON DELETE CASCADE
type        text CHECK (type IN ('image', 'voice')) NOT NULL
storage_url text NOT NULL
created_at  timestamptz DEFAULT now()
```

### `messages`
```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
post_id      uuid references posts(id) ON DELETE CASCADE
sender_id    uuid references profiles(id)
recipient_id uuid references profiles(id)
body         text
media_url    text
media_type   text CHECK (media_type IN ('image', 'voice'))
read_at      timestamptz
created_at   timestamptz DEFAULT now()
```

---

## Row Level Security (RLS)

All tables have RLS enabled. Core policy pattern:

```sql
-- User sees posts only in networks they belong to
CREATE POLICY "member sees network posts" ON posts
  FOR SELECT USING (
    network_id IN (
      SELECT network_id FROM network_members
      WHERE profile_id = auth.uid() AND status = 'active'
    )
  );
```

Same pattern applied to `messages`, `network_members`, `post_media`.

---

## Geographic Queries

PostGIS extension enabled on Supabase project.

```sql
-- Feed sorted by distance, filtered by radius
SELECT p.*, 
  ST_Distance(
    ST_Point(pr.lng, pr.lat)::geography,
    ST_Point($viewer_lng, $viewer_lat)::geography
  ) AS distance_m
FROM posts p
JOIN profiles pr ON pr.id = p.author_id
WHERE p.network_id = $network_id
  AND p.status = 'active'
  AND ST_DWithin(
    ST_Point(pr.lng, pr.lat)::geography,
    ST_Point($viewer_lng, $viewer_lat)::geography,
    $radius_meters
  )
ORDER BY distance_m ASC;
```

Radius filter options exposed in UI: ٢ كم / ٥ كم / ١٠ كم / المدينة كلها.

---

## Screens (8 total)

### 1. Onboarding
- Phone number entry → SMS OTP (Supabase Auth)
- Pharmacy name, owner name, country (JO/IQ), city
- Geolocation capture (`navigator.geolocation`) → lat/lng + reverse geocode label
- If arrived via invite link: auto-join network after profile complete

### 2. Feed (Home Tab — الرئيسية)
- Network selector pill at top (if member of multiple networks)
- Filter bar: الكل / عروض / مطلوب + radius selector
- Search bar: product name (English)
- Post cards sorted by: newest (default) or nearest
- FAB `+` → Create Post wizard

### 3. Post Card (in feed + detail screen)
- Badge: `قرب انتهاء` (red) or `مطلوب` (purple)
- Product name (English) + quantity + unit
- Price + original price (struck through) + auto-calculated discount %
- Expiry date with amber color + warning if < 3 months
- Distance badge (e.g. `٢.٣ كم`)
- Pharmacy name + city
- Image gallery (swipeable, up to 5 images)
- Voice note player (HTML5 audio, custom green UI)
- Actions: `أريد هذا` (→ DM) | `واتساب` (→ `wa.me/{phone}`) | `تفاصيل`
- Offer poster can mark post as `sold` or `closed`

### 4. Create Post Wizard (4 steps)
**Step 1 — Product**
- Toggle: عرض (offer) / مطلوب (wanted)
- Product name (English text input)
- Quantity + unit dropdown (علبة/شريط/أمبول/كيس/other)
- Expiry date picker (offers only)

**Step 2 — Price** *(offers only — wanted posts skip to Step 3)*
- Original price + currency (JOD/IQD)
- Selling price
- Discount % calculated and shown live
- WhatsApp number (pre-filled from profile, editable)

*For wanted posts: Step 2 = WhatsApp number + urgency note only*

**Step 3 — Media**
- Upload up to 5 images (compressed via Canvas API before upload)
- Record voice note (MediaRecorder API → webm/opus → Supabase Storage)
  - Max 60 seconds
  - Tap to record, tap to stop, preview before submitting
- Optional text description

**Step 4 — Review & Publish**
- Full preview of post as it will appear in feed
- Select which networks to post to (if member of multiple)
- Publish button → creates `posts` row + `post_media` rows

### 5. Messages / Inbox (الرسائل Tab)
- Thread list grouped by post (post thumbnail + product name as header)
- Unread count badge on tab
- Thread view: text messages + image sharing
- Realtime updates via Supabase `messages` subscription
- No voice notes in DMs (voice only on posts)

### 6. My Networks (شبكاتي Tab)
- List of networks I belong to with member count
- `+ إنشاء شبكة` — create new network (user becomes admin)
- `انضمام برابط` — paste invite link
- Tap network → network feed (filters feed to that network)
- Admin badge shown if user is admin of that network

### 7. Network Admin Panel (inside شبكاتي)
- Members list with join date + role
- Remove member
- Pending join requests (if invite has approval step — optional v2)
- Generate invite link: set expiry (7/14/30 days) + max uses
- Copy link button → share via WhatsApp / copy to clipboard
- Network settings: name, description, city, country

### 8. Profile (حسابي Tab)
- Pharmacy name, owner, city, country
- Phone number (WhatsApp)
- Location label + `تحديث الموقع` button
- My active posts (quick list)
- My completed deals (sold/closed posts)
- Edit profile
- Logout

---

## Media Handling

### Images
- Client-side compression: Canvas API resizes to max 1200px width, quality 0.8
- Upload to Supabase Storage bucket: `post-media/images/{post_id}/`
- Up to 5 images per post
- Swipeable gallery on post detail

### Voice Notes
- MediaRecorder API → `audio/webm;codecs=opus`
- Max 60 seconds
- Upload to Supabase Storage bucket: `post-media/voice/{post_id}/`
- Custom HTML5 audio player with green progress bar, play/pause, duration

---

## Invite Flow

1. Admin opens "Network Admin" → taps "توليد رابط دعوة"
2. Sets expiry (7/14/30 days) + max uses (default 50)
3. App creates row in `network_invites` with unique token
4. Link format: `https://dawwar.app/join/{token}`
5. Recipient opens link → if not registered: onboarding flow → auto-join
6. If already registered: confirm join → added to `network_members`
7. `uses_count` incremented on each use; link deactivated when `uses_count >= max_uses` or past `expires_at`

---

## WhatsApp Integration

Seller phone number stored on post. "واتساب" button opens:
```
https://wa.me/{phone}?text=مرحباً، رأيت منشورك على دوّار عن {product_name}
```
Pre-filled Arabic message so buyer's intent is clear immediately.

---

## PWA Config

- `manifest.json`: name "دوّار", green theme color `#059669`, icons
- Service Worker: cache app shell + static assets
- `dir="rtl"` on `<html>`
- Cairo or Tajawal Google Font for Arabic

---

## Design System

- **Background:** `#0d1f1a` (dark green-black)
- **Card bg:** `#132d21`
- **Border:** `#14532d`
- **Primary accent:** `#059669` (emerald)
- **Text primary:** `#f0fdf4`
- **Text secondary:** `#86efac`
- **Offer badge:** `#dc2626` red
- **Wanted badge:** `#7c3aed` purple
- **Success/price:** `#4ade80`
- **Warning/expiry:** `#fbbf24`
- **WhatsApp button:** `#25d366`

---

## Out of Scope (v1)

- Push notifications (v2 — requires FCM)
- In-app payment / escrow
- Product catalog / autocomplete
- Analytics dashboard
- English language toggle
- Rating / reputation system
