import { useState } from 'react'
import type { Stroke, Cut, EvaluationResult } from '../types'
import { DrawPhase } from '../components/DrawPhase'
import { CutPhase } from '../components/CutPhase'
import { ResultPhase } from '../components/ResultPhase'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const DEFAULT_CUT: Cut = {
  endpointA: { x: 0, y: 0 },
  endpointB: { x: 0, y: 600 },
}

export function GamePage() {
  const { user } = useAuth()
  const [phase, setPhase] = useState<'draw' | 'cut' | 'result'>('draw')
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [cut, setCut] = useState<Cut>(DEFAULT_CUT)
  const [result, setResult] = useState<EvaluationResult | null>(null)

  async function handleSubmit(r: EvaluationResult) {
    setResult(r)
    setPhase('result')

    if (user && supabaseConfigured) {
      await supabase.from('games').insert({
        user_id: user.id,
        score: Math.round(r.score),
        left_pct: r.leftPercentage,
        right_pct: r.rightPercentage,
      })
    }
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
