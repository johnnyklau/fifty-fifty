import { Stage, Layer, Rect, Line, Circle } from 'react-konva'
import type { Stroke, Cut, EvaluationResult } from '../types'

const CANVAS_W = 800
const CANVAS_H = 600

interface Props {
  strokes: Stroke[]
  cut: Cut
  result: EvaluationResult
  onPlayAgain: () => void
}

export function ResultPhase({ strokes, cut, result, onPlayAgain }: Props) {
  const { endpointA: a, endpointB: b } = cut
  const left = result.leftPercentage.toFixed(1)
  const right = result.rightPercentage.toFixed(1)
  const score = Math.round(result.score)

  return (
    <>
      <span className="phase-label">Result</span>
      <div className="canvas-wrapper canvas-wrapper--locked">
        <Stage width={CANVAS_W} height={CANVAS_H}>
          <Layer>
            <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill="#FFFFFF" />
            {strokes.map((s, i) => (
              <Line
                key={i}
                points={s.points.flat()}
                stroke={s.color}
                strokeWidth={s.size}
                lineCap="round"
                lineJoin="round"
                tension={0.4}
              />
            ))}
            <Line
              points={[a.x, a.y, b.x, b.y]}
              stroke="#FF0000"
              strokeWidth={2}
              dash={[10, 6]}
            />
            <Circle x={a.x} y={a.y} radius={8} fill="#FF0000" />
            <Circle x={b.x} y={b.y} radius={8} fill="#FF0000" />
          </Layer>
        </Stage>
      </div>

      <div className="controls">
        <div className="result-stats">
          <p className="result-split">
            {left}% / {right}%
          </p>
          <p className="result-score">
            Score: <strong>{score}</strong> / 100
          </p>
        </div>
        <button className="btn btn--primary" onClick={onPlayAgain}>
          Play Again
        </button>
      </div>
    </>
  )
}
