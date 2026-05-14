import { useRef, useState } from 'react'
import { Stage, Layer, Rect, Line, Circle } from 'react-konva'
import type Konva from 'konva'
import type { Stroke, Cut, EvaluationResult } from '../types'
import { projectToBorder, isValidCut } from '../utils/geometry'
import { evaluateCanvas } from '../utils/evaluator'

const CANVAS_W = 800
const CANVAS_H = 600

interface Props {
  strokes: Stroke[]
  cut: Cut
  onCutChange: (cut: Cut) => void
  onSubmit: (result: EvaluationResult) => void
}

export function CutPhase({ strokes, cut, onCutChange, onSubmit }: Props) {
  const drawingLayerRef = useRef<Konva.Layer>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingResult, setPendingResult] = useState<EvaluationResult | null>(null)

  function handleDragA(e: Konva.KonvaEventObject<DragEvent>) {
    const pos = projectToBorder(e.target.x(), e.target.y())
    e.target.position(pos)
    onCutChange({ ...cut, endpointA: pos })
    setError(null)
  }

  function handleDragB(e: Konva.KonvaEventObject<DragEvent>) {
    const pos = projectToBorder(e.target.x(), e.target.y())
    e.target.position(pos)
    onCutChange({ ...cut, endpointB: pos })
    setError(null)
  }

  function handleSubmit() {
    if (!isValidCut(cut.endpointA, cut.endpointB)) {
      setError('Both endpoints must be on different edges.')
      return
    }

    const layer = drawingLayerRef.current
    if (!layer) return

    const canvas = layer.toCanvas({ pixelRatio: 1 })
    const result = evaluateCanvas(canvas as HTMLCanvasElement, cut.endpointA, cut.endpointB)

    if (result.leftCount + result.rightCount === 0) {
      setError('Canvas is empty. Go back and draw something first.')
      return
    }
    if (result.leftCount === 0 || result.rightCount === 0) {
      setError('Cut line must have pixels on both sides.')
      return
    }

    if (result.score === 0) {
      setPendingResult(result)
      return
    }

    onSubmit(result)
  }

  const { endpointA: a, endpointB: b } = cut

  return (
    <>
      <span className="phase-label">Cut</span>
      <div className="canvas-wrapper canvas-wrapper--locked">
        <Stage width={CANVAS_W} height={CANVAS_H}>
          <Layer ref={drawingLayerRef}>
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
          </Layer>
          <Layer>
            <Line
              points={[a.x, a.y, b.x, b.y]}
              stroke="#FF0000"
              strokeWidth={2}
              dash={[10, 6]}
            />
            <Circle
              x={a.x}
              y={a.y}
              radius={8}
              fill="#FF0000"
              draggable
              onDragMove={handleDragA}
            />
            <Circle
              x={b.x}
              y={b.y}
              radius={8}
              fill="#FF0000"
              draggable
              onDragMove={handleDragB}
            />
          </Layer>
        </Stage>
      </div>

      <div className="controls">
        {error && <p className="error-msg">{error}</p>}
        <button className="btn btn--primary" onClick={handleSubmit}>
          Submit
        </button>
      </div>

      {pendingResult && (
        <div className="modal-overlay">
          <div className="modal">
            <p className="modal-title">Are you trolling?</p>
            <p className="modal-split">
              {pendingResult.leftPercentage.toFixed(1)}% /{' '}
              {pendingResult.rightPercentage.toFixed(1)}%
            </p>
            <div className="modal-actions">
              <button className="btn btn--secondary" onClick={() => setPendingResult(null)}>
                Go Back
              </button>
              <button className="btn btn--primary" onClick={() => onSubmit(pendingResult)}>
                Submit Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
