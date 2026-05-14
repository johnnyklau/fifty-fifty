import type { Point } from '../types'

export type PixelSide = 'left' | 'right' | 'on'

/**
 * Classifies a pixel relative to the cut line A→B using the cross-product test.
 * cross > 0 → left, cross < 0 → right, cross = 0 → on the line.
 */
export function classifyPixel(px: number, py: number, a: Point, b: Point): PixelSide {
  const cross = (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x)
  if (cross > 0) return 'left'
  if (cross < 0) return 'right'
  return 'on'
}

const CANVAS_W = 800
const CANVAS_H = 600

/**
 * Projects an arbitrary (x, y) point to the nearest point on the canvas border.
 * Returns the clamped border point.
 */
export function projectToBorder(x: number, y: number): Point {
  const candidates: Point[] = [
    { x: Math.max(0, Math.min(CANVAS_W, x)), y: 0 },
    { x: Math.max(0, Math.min(CANVAS_W, x)), y: CANVAS_H },
    { x: 0, y: Math.max(0, Math.min(CANVAS_H, y)) },
    { x: CANVAS_W, y: Math.max(0, Math.min(CANVAS_H, y)) },
  ]

  return candidates.reduce((best, candidate) => {
    const dBest = Math.hypot(best.x - x, best.y - y)
    const dCandidate = Math.hypot(candidate.x - x, candidate.y - y)
    return dCandidate < dBest ? candidate : best
  })
}

type Edge = 'top' | 'right' | 'bottom' | 'left' | 'corner'

/** Returns which border edge a point sits on, or 'corner' if at a corner. */
export function getEdge(p: Point): Edge {
  const atTop = p.y === 0
  const atBottom = p.y === CANVAS_H
  const atLeft = p.x === 0
  const atRight = p.x === CANVAS_W

  const edgeCount = [atTop, atBottom, atLeft, atRight].filter(Boolean).length
  if (edgeCount >= 2) return 'corner'
  if (atTop) return 'top'
  if (atBottom) return 'bottom'
  if (atLeft) return 'left'
  if (atRight) return 'right'
  return 'corner'
}

/**
 * Returns true if the two endpoints form a valid cut line.
 * Invalid if both are on the same non-corner edge and neither is at a corner.
 */
export function isValidCut(a: Point, b: Point): boolean {
  const edgeA = getEdge(a)
  const edgeB = getEdge(b)
  if (edgeA === 'corner' || edgeB === 'corner') return true
  return edgeA !== edgeB
}
