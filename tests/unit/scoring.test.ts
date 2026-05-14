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

  it('returns approximately 54.6 for a 40/60 split (error=10)', () => {
    // Formula: 100 × (e^(-0.018×10) - e^(-0.45)) / (1 - e^(-0.45)) ≈ 54.6
    const score = computeScore(400, 600)
    expect(score).toBeGreaterThan(50)
    expect(score).toBeLessThan(60)
  })

  it('returns 0 when total is 0', () => {
    expect(computeScore(0, 0)).toBe(0)
  })
})
