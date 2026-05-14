import { useRef, useState } from 'react'
import { Stage, Layer, Rect, Line } from 'react-konva'
import type Konva from 'konva'
import type { Stroke } from '../types'

const CANVAS_W = 800
const CANVAS_H = 600

const PALETTE = [
  { color: '#000000', label: 'Black' },
  { color: '#FF0000', label: 'Red' },
  { color: '#FF7F00', label: 'Orange' },
  { color: '#FFFF00', label: 'Yellow' },
  { color: '#00CC00', label: 'Green' },
  { color: '#0000FF', label: 'Blue' },
  { color: '#7F00FF', label: 'Purple' },
  { color: '#FF69B4', label: 'Pink' },
  { color: '#FFFFFF', label: 'Eraser' },
]

const BRUSH_SIZES = [4, 12, 28]

interface Props {
  strokes: Stroke[]
  onStrokesChange: (update: (prev: Stroke[]) => Stroke[]) => void
  onDone: () => void
}

export function DrawPhase({ strokes, onStrokesChange, onDone }: Props) {
  const [selectedColor, setSelectedColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(12)
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null)
  const isDrawing = useRef(false)

  function handleMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    isDrawing.current = true
    const pos = e.target.getStage()!.getPointerPosition()!
    setCurrentStroke({
      tool: selectedColor === '#FFFFFF' ? 'eraser' : 'brush',
      color: selectedColor,
      size: brushSize,
      points: [[pos.x, pos.y]],
    })
  }

  function handleMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    if (!isDrawing.current) return
    const pos = e.target.getStage()!.getPointerPosition()!
    setCurrentStroke(prev =>
      prev ? { ...prev, points: [...prev.points, [pos.x, pos.y]] } : prev,
    )
  }

  function handleMouseUp() {
    if (!isDrawing.current) return
    isDrawing.current = false
    if (currentStroke && currentStroke.points.length > 0) {
      onStrokesChange(prev => [...prev, currentStroke])
    }
    setCurrentStroke(null)
  }

  return (
    <>
      <span className="phase-label">Draw</span>
      <div className="canvas-wrapper" style={{ userSelect: 'none' }}>
        <Stage
          width={CANVAS_W}
          height={CANVAS_H}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
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
            {currentStroke && (
              <Line
                points={currentStroke.points.flat()}
                stroke={currentStroke.color}
                strokeWidth={currentStroke.size}
                lineCap="round"
                lineJoin="round"
                tension={0.4}
              />
            )}
          </Layer>
        </Stage>
      </div>

      <div className="controls">
        <div className="palette">
          {PALETTE.map(({ color, label }) => (
            <button
              key={color}
              className={`swatch${selectedColor === color ? ' swatch--active' : ''}${color === '#FFFFFF' ? ' swatch--white' : ''}`}
              style={{ background: color }}
              title={label}
              onClick={() => setSelectedColor(color)}
              aria-label={label}
              aria-pressed={selectedColor === color}
            />
          ))}
        </div>

        <div className="brush-sizes">
          {BRUSH_SIZES.map(size => (
            <button
              key={size}
              className={`brush-btn${brushSize === size ? ' brush-btn--active' : ''}`}
              style={{ width: size + 8, height: size + 8 }}
              title={`Size ${size}`}
              onClick={() => setBrushSize(size)}
              aria-label={`Brush size ${size}`}
              aria-pressed={brushSize === size}
            />
          ))}
        </div>

        <button className="btn btn--primary" onClick={onDone}>
          Done Drawing
        </button>
      </div>
    </>
  )
}
