import { useState } from 'react'
import type { Stroke, Cut, EvaluationResult } from './types'
import { DrawPhase } from './components/DrawPhase'
import { CutPhase } from './components/CutPhase'
import { ResultPhase } from './components/ResultPhase'
import './App.css'

const DEFAULT_CUT: Cut = {
  endpointA: { x: 0, y: 0 },
  endpointB: { x: 0, y: 600 },
}

function App() {
  const [phase, setPhase] = useState<'draw' | 'cut' | 'result'>('draw')
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [cut, setCut] = useState<Cut>(DEFAULT_CUT)
  const [result, setResult] = useState<EvaluationResult | null>(null)

  function handleSubmit(r: EvaluationResult) {
    setResult(r)
    setPhase('result')
  }

  function handlePlayAgain() {
    setStrokes([])
    setCut(DEFAULT_CUT)
    setResult(null)
    setPhase('draw')
  }

  return (
    <div className="game">
      {phase === 'draw' && (
        <DrawPhase strokes={strokes} onStrokesChange={setStrokes} onDone={() => setPhase('cut')} />
      )}
      {phase === 'cut' && (
        <CutPhase strokes={strokes} cut={cut} onCutChange={setCut} onSubmit={handleSubmit} />
      )}
      {phase === 'result' && result && (
        <ResultPhase strokes={strokes} cut={cut} result={result} onPlayAgain={handlePlayAgain} />
      )}
    </div>
  )
}

export default App
