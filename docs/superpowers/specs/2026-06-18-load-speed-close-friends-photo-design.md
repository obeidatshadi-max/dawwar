# Dawwar — Load speed, Close-friends circle, Pharmacy photo

Date: 2026-06-18
Status: Approved (design)

Three independent changes to the Dawwar PWA (React 18 + Vite 5 + Supabase).

---

## 1. Faster initial load

### Problem
Opening the web link takes a long time before the app is usable. Two independent causes:

1. **Auth gate waits on profile fetch.** `useAuthInit` (`src/hooks/useAuth.js`) only sets
   `loading=false` after `onAuthStateChange` fires *and* `fetchProfile` resolves. The route
   guards in `App.jsx` (`PrivateRoute` / `PublicOnlyRoute`) render a full-screen spinner while
   `loading` is true, so entry is gated behind two network round-trips (token refresh + profile
   select).
2. **No code splitting.** `App.jsx` eagerly imports every page (CreatePost's 4 steps, SeedTool,
   AdminPanel, CreateNetwork, etc.). The whole bundle must download + parse before first paint.

### Fix A — decouple entry from profile fetch
In `useAuthInit`, set `loading=false` as soon as the first auth event is known. Fetch the profile
in the background and call `setProfile` when it returns. Behavior of route guards is unchanged
because they already handle `profile == null` (`PublicOnlyRoute` only redirects when
`session && profile`; `PrivateRoute` only checks `session`).

Acceptance: with a valid stored session, the app no longer blocks the spinner on the profile
select; first interactive paint happens after the auth event, not after the profile row returns.

### Fix B — code-split routes
Convert the page imports in `App.jsx` to `React.lazy(() => import(...))` and wrap `<Routes>` in a
`<Suspense fallback={<spinner/>}>`. Reuse the existing spinner markup (extract to a small
`components/Spinner.jsx` to avoid duplication across `App.jsx` guards and the Suspense fallback).

Acceptance: production build emits separate chunks for the lazy pages; the initial JS payload no
longer includes SeedTool / CreatePost steps / AdminPanel.

### Out of scope
Workbox/PWA precache config is left as-is. No change to the Supabase client.

---

## 2. Close-friends circle in شبكاتي (Networks)

### Concept
A private, one-way "favorites" list: the user curates specific pharmacies from their active
networks into a close-friends circle, then can view those pharmacies' offers via a feed filter.
No friend requests or approval — it is a personal saved list.

### Data model
New table `close_friends`:

| column            | type        | notes                                         |
|-------------------|-------------|-----------------------------------------------|
| id                | uuid pk     | default gen_random_uuid()                     |
| owner_id          | uuid        | FK profiles.id (the list owner)               |
| friend_profile_id | uuid        | FK profiles.id (the favorited pharmacy)       |
| created_at        | timestamptz | default now()                                 |

- Unique constraint on `(owner_id, friend_profile_id)`.
- RLS: owner-only. `owner_id = auth.uid()` for select/insert/delete.
- Migration applied via Supabase Management API SQL (same path used for prior Dawwar DB changes),
  project ref `fgzgljffrqsupwhvtdvb`.

### Hooks
New `src/hooks/useCloseFriends.js`:
- `friends` — list of favorited profiles (join `close_friends` → `profiles`).
- `add(friendProfileId)` / `remove(friendProfileId)`.
- `loading`, `error`.

Member source for the picker: query `network_members` for the user's active networks joined to
`profiles`, excluding self and already-added friends. (Reuses the join pattern already in
`useNetworks` / AdminPanel.)

### UI — `Networks.jsx`
Add an **"الأصدقاء المقرّبون"** section above the networks list:
- Renders the circle as pharmacy cards (name, city, photo/initial avatar).
- **"＋ إضافة"** opens a member-picker modal/sheet listing network pharmacies to add/remove.
- **"عروضهم"** navigates to the feed filtered to the circle (`/feed?friends=1`).
- **Empty state:** 2–3 sample placeholder pharmacy cards, visually dimmed and labelled "مثال", so
  the section never looks empty before any friends are added. Same intent as the existing
  empty-feed demo cards. Placeholder cards are non-interactive except the "＋ إضافة" CTA.

### Feed filter
`Feed` reads an optional `?friends=1` query param. When set, it limits posts to those whose
`profile_id` is in the close-friends set (fetched via `useCloseFriends`). When the set is empty,
show a friendly empty state prompting the user to add close friends. Existing `?network=` filter
behavior is preserved and composes with `friends`.

---

## 3. Pharmacy photo upload

### Data model
Add column `photo_url text` (nullable) to `profiles` via Management API SQL migration.

### Storage
Reuse existing **`post-media`** bucket. Path: `pharmacy/{userId}.jpg`. Use `upsert: true`
(already the default in `uploadMedia`) so re-uploading replaces the photo.

### Upload flow
Reuse `compressImage(file, 1200, 0.8)` then `uploadMedia(supabase, 'post-media',
'pharmacy/{userId}.jpg', blob, 'image/jpeg')` from `src/lib/mediaUtils.js`. Save the returned
public URL to `profiles.photo_url`.

### UI
- **ProfileStep** (`src/pages/Onboarding/ProfileStep.jsx`): optional photo picker (tap avatar
  circle → file input, `accept="image/*"`). Preview the chosen image. Photo is uploaded as part of
  the onboarding profile save (the existing `onNext` → `saveProfile` path; extend to upload then
  include `photo_url`). Skippable — falls back to initial letter.
- **Profile** (`src/pages/Profile/Profile.jsx`): in edit mode, allow changing the photo. The
  avatar block renders `<img src={profile.photo_url}>` when present, else the existing initial
  letter.

### Rendering
Anywhere the round avatar appears (Profile header, close-friends cards), render `photo_url` when
present, falling back to the first letter of `pharmacy_name`.

---

## Testing
- Vitest unit tests for `useCloseFriends` (add/remove/list) mirroring existing hook tests.
- Test for the `?friends=1` feed filter logic.
- ProfileStep photo: preview state + that `photo_url` is included in the submitted payload (mock
  upload).
- Keep the existing 77 tests green.

## Deploy
Local `npm run build` + `netlify deploy --prod --dir dist` (not Netlify CI). DB migrations via
Management API SQL before deploy.
