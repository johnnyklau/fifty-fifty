export interface Stroke {
  tool: 'brush' | 'eraser'
  color: string
  size: number
  points: [number, number][]
}

export interface Point {
  x: number
  y: number
}

export interface Cut {
  endpointA: Point
  endpointB: Point
}

export type GamePhase = 'draw' | 'cut' | 'result'

export interface EvaluationResult {
  leftCount: number
  rightCount: number
  leftPercentage: number
  rightPercentage: number
  score: number
}
