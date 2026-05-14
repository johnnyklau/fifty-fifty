# 50/50 Split Game — Product Specification (V2)

## Goal

Deploy the game to production and establish the auth and user layer that V3 features (daily challenge, drawing pool, ratings) will build on.

---

## Milestones

1. **Vercel deployment** — site live at a public URL with auto-deploy on merge to `main`
2. **Supabase auth** — email/password + Google OAuth
3. **User accounts** — profile page with drawn avatar and tracked stats

---

## Deployment

**Host:** Vercel (zero-config for Vite)

**CI integration:**
- Every merge to `main` auto-deploys to production
- Every open PR gets a preview deployment URL (e.g. `fifty-fifty-git-feat-xyz.vercel.app`)
- Existing GitHub Actions CI (lint → typecheck → unit tests → E2E) runs first; Vercel deploys only on green

**Environment variables** (set in Vercel dashboard):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Auth

**Provider:** Supabase Auth

**Methods:**
- Email + password (sign up, log in, log out, password reset)
- Google OAuth

**UI:**
- Sign up / log in modal or dedicated page
- Persistent session (Supabase handles token refresh automatically)
- Header shows avatar + username when logged in; "Sign in" link when logged out
- Fully playable as a guest — account is not required to play

---

## Profile Page

Accessible at `/profile` (or via header) for logged-in users.

### Drawn profile picture

- Player draws their avatar using the existing DrawPhase canvas (smaller canvas, e.g. 400×400)
- On save, the canvas is rendered to an image and uploaded to **Supabase Storage**
- Displayed as a circular avatar throughout the UI
- Can be redrawn at any time

### Editable fields

- Display name (username)

### Stats (read-only, derived from game history)

| Stat | Description |
|---|---|
| Average score | Mean cut score across all submitted games |
| Best score | Personal record cut score |
| Games played | Total completed games |
| Perfect cuts | Number of times scoring exactly 100 |
| Current streak | Consecutive days with at least one completed game |
| Consistency rating | Standard deviation of scores — lower = more consistent |

---

## Database Schema (Supabase / Postgres)

### `profiles`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | References `auth.users.id` |
| `username` | `text` | Unique display name |
| `avatar_url` | `text` | Supabase Storage URL |
| `created_at` | `timestamptz` | |

### `games`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | |
| `user_id` | `uuid` | References `profiles.id`, nullable (guest play) |
| `score` | `integer` | 0–100 |
| `left_pct` | `numeric` | Left side percentage |
| `right_pct` | `numeric` | Right side percentage |
| `played_at` | `timestamptz` | |

Stats (average score, best score, games played, perfect cuts, streak, consistency) are computed from `games` — no denormalization needed at this scale.

---

## Tech Stack Changes

| Layer | V1 | V2 |
|---|---|---|
| Auth | None | Supabase Auth |
| Database | None | Supabase Postgres |
| Storage | None | Supabase Storage (avatars) |
| Hosting | Local only | Vercel |
| Routing | None | React Router (profile page, auth pages) |

---

## Out of Scope for V2

See `spec-v1.md` → V3 Pipeline section for de-scoped items (daily challenge, drawing pool, ratings, etc.).

---

## Future Extensions (V3+)

See `spec-v1.md` → Future Extensions and V3 Pipeline.
