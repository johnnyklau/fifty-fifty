/**
 * Exponential scoring curve: returns 100 at 50/50, 0 at 25/75 or worse.
 * Formula: max(0, 100 × (e^(-0.018×error) - e^(-0.45)) / (1 - e^(-0.45)))
 */
export function computeScore(leftCount: number, rightCount: number): number {
  const total = leftCount + rightCount
  if (total === 0) return 0

  const leftPercentage = (leftCount / total) * 100
  const error = Math.abs(50 - leftPercentage)

  const k = 0.018
  const cutoff = 0.45
  const numerator = Math.exp(-k * error) - Math.exp(-cutoff)
  const denominator = 1 - Math.exp(-cutoff)

  return Math.max(0, 100 * (numerator / denominator))
}
