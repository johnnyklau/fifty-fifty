import { useEffect, useRef } from 'react'
import type { Stroke } from '../types'

const SRC_W = 800
const THUMB_W = 200
const THUMB_H = 150
const SCALE = THUMB_W / SRC_W

interface Props {
  strokes: Stroke[]
}

export function DrawingThumbnail({ strokes }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, THUMB_W, THUMB_H)

    ctx.save()
    ctx.scale(SCALE, SCALE)

    for (const s of strokes) {
      if (s.points.length < 2) continue
      ctx.beginPath()
      ctx.strokeStyle = s.color
      ctx.lineWidth = s.size
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.moveTo(s.points[0][0], s.points[0][1])
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i][0], s.points[i][1])
      }
      ctx.stroke()
    }

    ctx.restore()
  }, [strokes])

  return (
    <canvas
      ref={canvasRef}
      width={THUMB_W}
      height={THUMB_H}
      className="drawing-thumbnail"
    />
  )
}
