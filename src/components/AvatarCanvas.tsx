import { useRef, useState, useImperativeHandle } from 'react'
import type React from 'react'
import { Stage, Layer, Rect, Line } from 'react-konva'
import type Konva from 'konva'
import type { Stroke } from '../types'

const CANVAS_SIZE = 300
const PALETTE = ['#000000', '#FF0000', '#FF7F00', '#00CC00', '#0000FF', '#7F00FF', '#FF69B4', '#FFFFFF']
const BRUSH_SIZES = [4, 12, 28]

export interface AvatarCanvasHandle {
  toDataURL: () => string
}

export function AvatarCanvas({ ref }: { ref?: React.Ref<AvatarCanvasHandle> }) {
  const stageRef = useRef<Konva.Stage>(null)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null)
  const [color, setColor] = useState('#000000')
  const [size, setSize] = useState(12)
  const isDrawing = useRef(false)

  useImperativeHandle(ref, () => ({
    toDataURL: () => stageRef.current?.toDataURL() ?? '',
  }))

  function handleMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    isDrawing.current = true
    const pos = e.target.getStage()!.getPointerPosition()!
    setCurrentStroke({
      tool: color === '#FFFFFF' ? 'eraser' : 'brush',
      color,
      size,
      points: [[pos.x, pos.y]],
    })
  }

  function handleMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    if (!isDrawing.current || !currentStroke) return
    const pos = e.target.getStage()!.getPointerPosition()!
    setCurrentStroke(s => s ? { ...s, points: [...s.points, [pos.x, pos.y]] } : s)
  }

  function commitStroke() {
    if (!isDrawing.current || !currentStroke) return
    isDrawing.current = false
    setStrokes(prev => [...prev, currentStroke])
    setCurrentStroke(null)
  }

  return (
    <div className="avatar-canvas-container">
      <div className="canvas-wrapper" style={{ cursor: 'crosshair' }}>
        <Stage
          ref={stageRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={commitStroke}
          onMouseLeave={commitStroke}
        >
          <Layer>
            <Rect x={0} y={0} width={CANVAS_SIZE} height={CANVAS_SIZE} fill="#FFFFFF" />
            {strokes.map((s, i) => (
              <Line
                key={i}
                points={s.points.flat()}
                stroke={s.color}
                strokeWidth={s.size}
                lineCap="round"
                lineJoin="round"
                tension={0.4}
                globalCompositeOperation={s.tool === 'eraser' ? 'destination-out' : 'source-over'}
              />
            ))}
            {currentStroke && (
              <Line
                points={currentStroke.points.flat()}
                stroke={currentStroke.color}
                strokeWidth={currentStroke.size}
                lineCap="round"
                lineJoin="round"
                tension={0.4}
                globalCompositeOperation={currentStroke.tool === 'eraser' ? 'destination-out' : 'source-over'}
              />
            )}
          </Layer>
        </Stage>
      </div>

      <div className="controls" style={{ width: CANVAS_SIZE }}>
        <div className="palette">
          {PALETTE.map(c => (
            <button
              key={c}
              className={`swatch${c === color ? ' swatch--active' : ''}${c === '#FFFFFF' ? ' swatch--white' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={c}
            />
          ))}
        </div>
        <div className="brush-sizes">
          {BRUSH_SIZES.map(s => (
            <button
              key={s}
              className={`brush-btn${s === size ? ' brush-btn--active' : ''}`}
              style={{ width: s + 16, height: s + 16 }}
              onClick={() => setSize(s)}
              aria-label={`Brush size ${s}`}
            />
          ))}
        </div>
        <button className="btn btn--secondary" onClick={() => setStrokes([])}>
          Clear
        </button>
      </div>
    </div>
  )
}
