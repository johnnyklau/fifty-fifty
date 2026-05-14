/**
 * Power-law scoring curve: 100 at 50/50, ~70 at 40/60, 0 at 25/75 or worse.
 * Formula: max(0, 100 × (1 − error/25)^0.7)
 *
 * The original spec's exponential formula is convex and cannot exceed the linear
 * baseline (~60 at error=10) while zeroing at 25. This concave power law matches
 * the spec's reference table exactly.
 */
export function computeScore(leftCount: number, rightCount: number): number {
  const total = leftCount + rightCount
  if (total === 0) return 0

  const leftPercentage = (leftCount / total) * 100
  const error = Math.abs(50 - leftPercentage)

  if (error >= 25) return 0
  return 100 * Math.pow(1 - error / 25, 0.7)
}
