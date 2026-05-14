import { describe, it, expect } from 'vitest'
import { classifyPixel, projectToBorder, isValidCut, getEdge } from '../../src/utils/geometry'

describe('classifyPixel', () => {
  // Line goes left→right along y=0. In canvas coords (y-down), cross=(b.x-a.x)*(py-a.y) - 0.
  // py > 0 (below the line on screen) → cross > 0 → 'left'.
  // py < 0 (above the line on screen) → cross < 0 → 'right'.
  const a = { x: 0, y: 0 }
  const b = { x: 800, y: 0 }

  it('classifies a pixel below the horizontal line (screen coords) as left', () => {
    expect(classifyPixel(400, 10, a, b)).toBe('left')
  })

  it('classifies a pixel above the horizontal line (screen coords) as right', () => {
    expect(classifyPixel(400, -10, a, b)).toBe('right')
  })

  it('classifies a pixel on the line as on', () => {
    expect(classifyPixel(400, 0, a, b)).toBe('on')
  })
})

describe('projectToBorder', () => {
  it('snaps interior point to nearest edge', () => {
    const p = projectToBorder(400, 10)
    expect(p.y).toBe(0)
    expect(p.x).toBe(400)
  })

  it('clamps x to canvas width', () => {
    const p = projectToBorder(900, 300)
    expect(p.x).toBe(800)
  })
})

describe('isValidCut', () => {
  it('allows cuts between different edges', () => {
    expect(isValidCut({ x: 400, y: 0 }, { x: 400, y: 600 })).toBe(true)
  })

  it('rejects cuts where both endpoints are on the same edge (non-corner)', () => {
    expect(isValidCut({ x: 1, y: 0 }, { x: 100, y: 0 })).toBe(false)
  })

  it('allows cuts where one endpoint is at a corner', () => {
    expect(isValidCut({ x: 0, y: 0 }, { x: 100, y: 0 })).toBe(true)
  })
})

describe('getEdge', () => {
  it('identifies top edge', () => {
    expect(getEdge({ x: 400, y: 0 })).toBe('top')
  })

  it('identifies corner', () => {
    expect(getEdge({ x: 0, y: 0 })).toBe('corner')
  })

  it('identifies left edge', () => {
    expect(getEdge({ x: 0, y: 300 })).toBe('left')
  })
})
