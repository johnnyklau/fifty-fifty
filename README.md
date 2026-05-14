# 50/50 Split Game

[![CI](https://github.com/johnnyklau/fifty-fifty/actions/workflows/ci.yml/badge.svg)](https://github.com/johnnyklau/fifty-fifty/actions/workflows/ci.yml)

Draw anything on a canvas, then slice it with a single straight line. Score points based on how close your split is to 50/50.

## How to play

1. **Draw** — pick a color and brush size, draw freely on the 800×600 canvas
2. **Cut** — drag the two red handles along the canvas border to position your cut line
3. **Score** — see your left/right split percentage and score out of 100

A perfect 50/50 scores 100. Anything 25/75 or worse scores 0 — and earns a popup.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm test` | Unit + component tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright) |
| `npm run coverage` | Test coverage report |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |

## Stack

- **UI** — React 19 + TypeScript
- **Canvas** — react-konva
- **Build** — Vite
- **Testing** — Vitest, React Testing Library, Playwright
- **CI** — GitHub Actions
