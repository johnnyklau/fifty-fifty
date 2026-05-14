# 50/50 Split Game — Product Specification (V3)

## Goal

Add a daily challenge mode: each day, logged-in players draw to a prompt, then cut a stranger's drawing of the same prompt. Introduce star ratings on drawings and surface an average drawing rank stat on player profiles.

---

## Milestones

1. **Daily challenge** — prompt-based two-phase flow (draw → cut a stranger's drawing)
2. **Drawing pool** — store and serve stroke data per prompt
3. **Star ratings** — rate the drawing you cut; feeds into drawer's profile stat

---

## Daily Challenge Flow

### Eligibility
- Requires a logged-in account
- One challenge attempt per user per day (UTC day boundary)
- Free play remains unchanged and accessible to guests

### Phase 1 — Draw
- Player is shown the day's prompt (e.g. "Draw a cat")
- Draws on the standard 800×600 canvas
- On submit, stroke data is stored in `drawings` table, associated with today's prompt
- Player immediately advances to Phase 2 — no waiting

### Phase 2 — Cut
- A random drawing from the pool for today's prompt is served (from any day — carry-over)
- If no drawings exist for today's prompt, a random drawing from any other prompt is served instead
- If the pool is completely empty, a seed drawing is served as the absolute fallback
- Player cuts the stranger's drawing exactly like free play
- Score is computed and saved to `games` (same as free play), with `drawing_id` linked
- After submitting, player is shown their score and prompted to rate the drawing

### Rating
- 1–5 star rating, required before results are dismissed
- Stored in `ratings` table, linked to the drawing and rater
- Feeds into the drawer's average drawing rank stat on their profile

---

## Prompts

Prompts live in a `prompts` Supabase table, seeded via SQL migration. New prompts are added and scheduled directly in the Supabase dashboard — no admin UI needed. The active prompt for a given UTC date is the row where `active_date = CURRENT_DATE`.

---

## Database Schema (additions to V2)

### `prompts`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | |
| `text` | `text` | e.g. "Draw a cat" |
| `active_date` | `date` | Unique — one prompt per day |

### `drawings`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | |
| `user_id` | `uuid` | References `profiles.id`, nullable (seed drawings) |
| `prompt_id` | `uuid` | References `prompts.id` |
| `strokes` | `jsonb` | Serialised stroke array |
| `submitted_at` | `timestamptz` | |

### `ratings`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | |
| `drawing_id` | `uuid` | References `drawings.id` |
| `rater_id` | `uuid` | References `profiles.id` |
| `stars` | `smallint` | 1–5 |
| `rated_at` | `timestamptz` | |
| unique constraint | | `(drawing_id, rater_id)` — one rating per drawing per user |

### `games` (updated)
- Add nullable `drawing_id uuid` column referencing `drawings.id`
- Links a challenge cut back to the drawing that was cut

---

## Seed Drawings

A small set of seed drawings stored in `drawings` with `user_id = null`. These are the absolute fallback — only served when the pool contains no user-submitted drawings at all. Seeded via SQL migration. No requirement for one per prompt.

---

## Profile Stat Addition

| Stat | Description |
|---|---|
| Average drawing rank | Mean star rating across all ratings received on the user's submitted drawings |

---

## UI Changes

### Header / Nav
- New **Daily** link in the header
- Shows a checkmark if today's challenge is already completed

### Daily Challenge Page (`/daily`)
- Not logged in → prompt to sign in
- Already completed today → show today's score + countdown to tomorrow
- Otherwise → runs the two-phase flow (draw → cut → rate)

### Rating UI
- Shown on the result screen after a challenge cut (not in free play)
- 5 clickable stars + submit button
- Dismisses to the completed/score view

---

## Tech Stack Changes

| Layer | V2 | V3 |
|---|---|---|
| New tables | — | `prompts`, `drawings`, `ratings` |
| `games` | score + split | + nullable `drawing_id` |
| New route | — | `/daily` |

---

## Out of Scope for V3

- Anonymous session management / UUID-to-account linking
- Leaderboards
- Replay system
- Admin UI for prompts (use Supabase dashboard directly)

---

## Future Extensions (V4+)

- Leaderboard — daily top scores per prompt
- Replay system — replay any drawing using stored stroke data
- Anonymous play — UUID in localStorage, linkable to account on sign-up
- Admin UI — schedule and preview prompts without touching the dashboard
