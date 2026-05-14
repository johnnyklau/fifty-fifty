# 50/50 Split Game — Product Specification (V1)

[![CI](https://github.com/johnnyklau/fifty-fifty/actions/workflows/ci.yml/badge.svg)](https://github.com/johnnyklau/fifty-fifty/actions/workflows/ci.yml)

## Overview

A single-player drawing puzzle game where the player creates a freeform drawing on a canvas, then attempts to divide it into two equal halves using a single straight line. The goal is to achieve the closest possible 50/50 pixel split.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React + TypeScript |
| Canvas / Interactions | react-konva |
| Build Tool | Vite |
| Unit / Component Testing | Vitest + React Testing Library |
| End-to-End Testing | Playwright |
| CI/CD | GitHub Actions |
| Deployment | Vercel or Netlify (zero-config GitHub integration) |

---

## Core Gameplay Loop

### Phase 1 — Draw

- Player draws freely on an 800×600 canvas
- A fixed color palette is available (see Palette below)
- Three brush sizes available: small (4px), medium (12px), large (28px)
- Drawing is stored as stroke data (source of truth for replay/future features)
- No restrictions on brush strokes or shapes

### Phase 2 — Cut

- Drawing is locked; no further edits
- Two red circular endpoint handles appear on the canvas border
- Default positions: top-left corner and bottom-left corner
- Player drags endpoints along the border to define a cut line
- A dotted line renders in real-time between the two endpoints
- No snapping

### Phase 3 — Result

- Canvas is evaluated using pixel data
- Split percentages are displayed
- Score is displayed
- Player can start over via "Play Again"

---

## Canvas

- **Dimensions:** 800×600px, fixed, centered on page
- **Background:** White (`#FFFFFF`)
- **Rendering:** react-konva canvas layer
- **Stroke data** is the source of truth; scoring is derived from the rendered raster output via `getImageData()`. Minor edge-pixel ambiguity from anti-aliasing is acknowledged and acceptable at MVP scale.

---

## Color Palette

A fixed set of pre-defined colors. White serves as both the background color and the eraser.

| Color | Hex |
|---|---|
| White (background / eraser) | `#FFFFFF` |
| Black | `#000000` |
| Red | `#FF0000` |
| Orange | `#FF7F00` |
| Yellow | `#FFFF00` |
| Green | `#00CC00` |
| Blue | `#0000FF` |
| Purple | `#7F00FF` |
| Pink | `#FF69B4` |

Background detection is exact: any pixel matching white (`#FFFFFF`) is classified as background and excluded from scoring.

---

## Cut Line — Endpoint Rules

- Each endpoint is a draggable red circular handle
- Endpoints slide freely along the canvas border (no snapping)
- **Default positions:** top-left corner `(0, 0)` and bottom-left corner `(0, 600)`
- **Constraint:** Both endpoints may not occupy the same edge simultaneously, unless one of them is positioned exactly at a corner coordinate
  - `(0,0), (100,0)` — **allowed** (one endpoint is exactly at a corner)
  - `(1,0), (100,0)` — **not allowed** (both on the same edge, neither at a corner)

---

## Submission Validation

Before scoring, the submission is validated in order:

1. **Same-edge check** — if both endpoints are on the same non-corner edge, submission is blocked with an error message
2. **Empty canvas check** — if no non-background pixels exist, submission is blocked
3. **Zero-side check** — if either side of the cut line contains zero non-background pixels, submission is blocked with an error message

Both sides must contain at least one non-background pixel for submission to proceed.

If all checks pass but the score is 0 (split is 25/75 or worse), a confirmation popup appears ("Are you trolling?") showing the split. The player can go back to adjust the cut or submit anyway.

---

## Pixel Classification

Scoring uses the rendered canvas pixel data via `getImageData()`.

For each non-background pixel at position `(xP, yP)`, its side is determined using a cross-product test against the cut line defined by endpoints `A (xA, yA)` and `B (xB, yB)`:

```
cross = (xB - xA)(yP - yA) - (yB - yA)(xP - xA)
```

- `cross > 0` → Left side
- `cross < 0` → Right side
- `cross = 0` → On the line (excluded or assigned to either side consistently)

---

## Scoring

Scoring uses a power-law curve that heavily rewards splits close to 50/50 and returns exactly 0 for splits of 25/75 or worse.

**Formula:**

```
error = |50 - leftPercentage|
score = max(0, 100 × (1 − error/25)^0.7)
```

**Reference points:**

| Split | Score |
|---|---|
| 50 / 50 | 100 |
| 40 / 60 | ~70 |
| 25 / 75 | 0 |
| 10 / 90 | 0 |
| 0 / 100 | 0 |

Scores are always in the range `[0, 100]`.

---

## Data Model

### Stroke

```ts
interface Stroke {
  tool: "brush" | "eraser";
  color: string;       // hex value from palette
  size: number;        // brush size in px
  points: [number, number][];  // [x, y] pairs
}
```

### Cut Definition

```ts
interface Cut {
  endpointA: { x: number; y: number };
  endpointB: { x: number; y: number };
}
```

---

## UI Flow

### Screen 1 — Draw
- 800×600 canvas
- Color palette selector (8 colors + white eraser)
- Brush size selector (small / medium / large)
- Brush tool active by default
- White/eraser selectable from palette
- "Done Drawing" button → advances to Cut phase

### Screen 2 — Cut
- Canvas locked (no drawing)
- Two red endpoint handles on border
- Dotted line renders between endpoints in real time
- Inline error shown for: same-edge endpoints, empty canvas, zero-side split
- If score would be 0, a popup asks "Are you trolling?" before confirming
- "Submit" button → advances to Result phase (or triggers popup)

### Screen 3 — Result
- Cut line displayed on canvas
- Left / right percentages shown
- Score displayed
- "Play Again" button → resets to Draw phase

---

## Testing Strategy

| Layer | Tool | What to Test |
|---|---|---|
| Unit | Vitest | Scoring formula, cross-product classification, validation logic |
| Component | React Testing Library | Phase transitions, button states, palette selection |
| End-to-End | Playwright | Full draw → cut → score flow |

CI runs linting (ESLint), type checking (`tsc`), unit tests, and E2E tests on every PR. Passing status badges displayed in README.

---

## Performance Notes

- Pixel evaluation runs only on submit
- Canvas scan is acceptable at 800×600 scale
- Future optimizations (not in MVP): pixel sampling, bounding box filtering, Web Workers

---

## Design Constraints (MVP)

- Single-player only
- No backend
- No accounts
- No multiplayer
- No animations (instant result reveal)
- Fully local execution

---

## Future Extensions

- Multiplayer mode (shared puzzles)
- Community-generated drawings
- Ranked leaderboard system
- Animated cut reveal system
- Replay system (enabled by stroke-based data model)

### V3 Pipeline (de-scoped from V2)

- **Prompt-based daily challenge** — two-phase: draw to a prompt, then cut a stranger's drawing of the same prompt
- **Drawing pool** — submit stroke data to backend; backend serves a random drawing from the pool for the same prompt per day
- **Seed/default drawings** — one default drawing per prompt for day-one / empty pool fallback
- **Star rating system** — after cutting, rate the drawing 1–5 stars; feeds into average drawing rank on player profiles
- **Average drawing rank** — per-user stat derived from ratings received on submitted drawings
- **Anonymous session management** — UUID in localStorage as pre-account identity; linkable to a real account on sign-up
