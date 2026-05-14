import type { Point, EvaluationResult } from '../types'
import { classifyPixel } from './geometry'
import { computeScore } from './scoring'

/**
 * Evaluates the pixel split for a canvas element given two cut endpoints.
 * Only non-white pixels are counted. Returns left/right counts, percentages, and score.
 */
export function evaluateCanvas(
  canvas: HTMLCanvasElement,
  a: Point,
  b: Point,
): EvaluationResult {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get 2D context')

  const { width, height } = canvas
  const { data } = ctx.getImageData(0, 0, width, height)

  let leftCount = 0
  let rightCount = 0

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const i = (py * width + px) * 4
      const r = data[i]
      const g = data[i + 1]
      const bChannel = data[i + 2]
      const alpha = data[i + 3]

      if (alpha === 0 || (r === 255 && g === 255 && bChannel === 255)) continue

      const side = classifyPixel(px, py, a, b)
      if (side === 'left') leftCount++
      else if (side === 'right') rightCount++
    }
  }

  const total = leftCount + rightCount
  const leftPercentage = total > 0 ? (leftCount / total) * 100 : 50
  const rightPercentage = 100 - leftPercentage
  const score = computeScore(leftCount, rightCount)

  return { leftCount, rightCount, leftPercentage, rightPercentage, score }
}
