import { describe, it, expect } from 'vitest'
import { computeScore } from '../../src/utils/scoring'

describe('computeScore', () => {
  it('returns 100 for a perfect 50/50 split', () => {
    expect(computeScore(500, 500)).toBeCloseTo(100, 1)
  })

  it('returns 0 for a 25/75 split', () => {
    expect(computeScore(250, 750)).toBeCloseTo(0, 1)
  })

  it('returns 0 for a 0/100 split', () => {
    expect(computeScore(0, 1000)).toBe(0)
  })

  it('returns approximately 70 for a 40/60 split', () => {
    // Power law: 100 × (1 - 10/25)^0.7 = 100 × (0.6)^0.7 ≈ 70.0
    const score = computeScore(400, 600)
    expect(score).toBeGreaterThan(68)
    expect(score).toBeLessThan(72)
  })

  it('returns 0 when total is 0', () => {
    expect(computeScore(0, 0)).toBe(0)
  })
})
