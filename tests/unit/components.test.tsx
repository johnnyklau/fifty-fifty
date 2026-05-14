import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { DrawPhase } from '../../src/components/DrawPhase'
import { CutPhase } from '../../src/components/CutPhase'
import { ResultPhase } from '../../src/components/ResultPhase'
import type { EvaluationResult } from '../../src/types'

vi.mock('../../src/utils/evaluator')
import { evaluateCanvas } from '../../src/utils/evaluator'
const mockEvaluateCanvas = vi.mocked(evaluateCanvas)

// Konva requires a canvas environment — provide a minimal stub
vi.mock('react-konva', () => {
  const React = require('react')
  const stub = ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children)
  // Layer must forward the ref and expose toCanvas() so handleSubmit can proceed
  const Layer = React.forwardRef(({ children }: { children?: React.ReactNode }, ref: React.Ref<unknown>) => {
    React.useImperativeHandle(ref, () => ({
      toCanvas: () => document.createElement('canvas'),
    }))
    return React.createElement('div', null, children)
  })
  return { Stage: stub, Layer, Rect: () => null, Line: () => null, Circle: () => null }
})

const DEFAULT_CUT = { endpointA: { x: 0, y: 0 }, endpointB: { x: 0, y: 600 } }
const VALID_RESULT: EvaluationResult = {
  leftCount: 500,
  rightCount: 500,
  leftPercentage: 50,
  rightPercentage: 50,
  score: 100,
}
const ZERO_SCORE_RESULT: EvaluationResult = {
  leftCount: 50,
  rightCount: 950,
  leftPercentage: 5,
  rightPercentage: 95,
  score: 0,
}
const ZERO_SIDE_RESULT: EvaluationResult = {
  leftCount: 0,
  rightCount: 1000,
  leftPercentage: 0,
  rightPercentage: 100,
  score: 0,
}

// ─── DrawPhase ────────────────────────────────────────────────────────────────

describe('DrawPhase', () => {
  it('renders phase label and Done Drawing button', () => {
    render(
      <DrawPhase strokes={[]} onStrokesChange={vi.fn()} onDone={vi.fn()} />,
    )
    expect(screen.getByText('Draw')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Done Drawing' })).toBeInTheDocument()
  })

  it('renders all 9 palette swatches', () => {
    render(
      <DrawPhase strokes={[]} onStrokesChange={vi.fn()} onDone={vi.fn()} />,
    )
    expect(screen.getAllByRole('button', { name: /black|red|orange|yellow|green|blue|purple|pink|eraser/i })).toHaveLength(9)
  })

  it('marks black as the default active swatch', () => {
    render(
      <DrawPhase strokes={[]} onStrokesChange={vi.fn()} onDone={vi.fn()} />,
    )
    const blackSwatch = screen.getByRole('button', { name: 'Black' })
    expect(blackSwatch).toHaveClass('swatch--active')
  })

  it('marks a clicked swatch as active', () => {
    render(
      <DrawPhase strokes={[]} onStrokesChange={vi.fn()} onDone={vi.fn()} />,
    )
    const redSwatch = screen.getByRole('button', { name: 'Red' })
    fireEvent.click(redSwatch)
    expect(redSwatch).toHaveClass('swatch--active')
    expect(screen.getByRole('button', { name: 'Black' })).not.toHaveClass('swatch--active')
  })

  it('calls onDone when Done Drawing is clicked', () => {
    const onDone = vi.fn()
    render(
      <DrawPhase strokes={[]} onStrokesChange={vi.fn()} onDone={onDone} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Done Drawing' }))
    expect(onDone).toHaveBeenCalledOnce()
  })
})

// ─── CutPhase ─────────────────────────────────────────────────────────────────

describe('CutPhase', () => {
  const baseProps = {
    strokes: [],
    cut: DEFAULT_CUT,
    onCutChange: vi.fn(),
    onSubmit: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders phase label and Submit button', () => {
    render(<CutPhase {...baseProps} />)
    expect(screen.getByText('Cut')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
  })

  it('shows same-edge error without calling evaluateCanvas', () => {
    // Default cut: both endpoints on the left edge (non-corner edges would trigger it;
    // (0,0) is a corner so the default actually passes — use a non-corner same-edge pair)
    render(
      <CutPhase
        {...baseProps}
        cut={{ endpointA: { x: 1, y: 0 }, endpointB: { x: 400, y: 0 } }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(screen.getByText(/different edges/i)).toBeInTheDocument()
    expect(mockEvaluateCanvas).not.toHaveBeenCalled()
  })

  it('shows empty canvas error when no pixels are drawn', () => {
    mockEvaluateCanvas.mockReturnValue({
      leftCount: 0, rightCount: 0, leftPercentage: 50, rightPercentage: 50, score: 0,
    })
    render(<CutPhase {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(screen.getByText(/canvas is empty/i)).toBeInTheDocument()
  })

  it('shows zero-side error when all pixels are on one side', () => {
    mockEvaluateCanvas.mockReturnValue(ZERO_SIDE_RESULT)
    render(<CutPhase {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(screen.getByText(/both sides/i)).toBeInTheDocument()
  })

  it('shows trolling popup when score is 0 but both sides have pixels', () => {
    mockEvaluateCanvas.mockReturnValue(ZERO_SCORE_RESULT)
    render(<CutPhase {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(screen.getByText(/are you trolling/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go Back' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit Anyway' })).toBeInTheDocument()
  })

  it('dismisses the popup when Go Back is clicked', () => {
    mockEvaluateCanvas.mockReturnValue(ZERO_SCORE_RESULT)
    render(<CutPhase {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Go Back' }))
    expect(screen.queryByText(/are you trolling/i)).not.toBeInTheDocument()
  })

  it('calls onSubmit when Submit Anyway is clicked', () => {
    const onSubmit = vi.fn()
    mockEvaluateCanvas.mockReturnValue(ZERO_SCORE_RESULT)
    render(<CutPhase {...baseProps} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit Anyway' }))
    expect(onSubmit).toHaveBeenCalledWith(ZERO_SCORE_RESULT)
  })

  it('calls onSubmit directly when score is > 0', () => {
    const onSubmit = vi.fn()
    mockEvaluateCanvas.mockReturnValue(VALID_RESULT)
    render(<CutPhase {...baseProps} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(onSubmit).toHaveBeenCalledWith(VALID_RESULT)
    expect(screen.queryByText(/are you trolling/i)).not.toBeInTheDocument()
  })
})

// ─── ResultPhase ──────────────────────────────────────────────────────────────

describe('ResultPhase', () => {
  const baseProps = {
    strokes: [],
    cut: DEFAULT_CUT,
    result: VALID_RESULT,
    onPlayAgain: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders phase label, percentages, and score', () => {
    render(<ResultPhase {...baseProps} />)
    expect(screen.getByText('Result')).toBeInTheDocument()
    expect(screen.getByText(/50\.0%\s*\/\s*50\.0%/)).toBeInTheDocument()
    expect(screen.getByText(/Score:/)).toBeInTheDocument()
  })

  it('calls onPlayAgain when Play Again is clicked', () => {
    const onPlayAgain = vi.fn()
    render(<ResultPhase {...baseProps} onPlayAgain={onPlayAgain} />)
    fireEvent.click(screen.getByRole('button', { name: 'Play Again' }))
    expect(onPlayAgain).toHaveBeenCalledOnce()
  })
})
