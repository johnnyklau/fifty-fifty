import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { DrawPhase } from '../components/DrawPhase'
import { CutPhase } from '../components/CutPhase'
import { ResultPhase } from '../components/ResultPhase'
import { RatingUI } from '../components/RatingUI'
import type { Stroke, Cut, EvaluationResult } from '../types'

const DEFAULT_CUT: Cut = {
  endpointA: { x: 0, y: 0 },
  endpointB: { x: 0, y: 600 },
}

interface Prompt {
  id: string
  text: string
}

interface Drawing {
  id: string
  strokes: Stroke[]
}

type Phase = 'loading' | 'no-prompt' | 'already-done' | 'drawing' | 'saving' | 'cutting' | 'rating' | 'done' | 'error'

function msUntilMidnightUTC() {
  const now = new Date()
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  return midnight.getTime() - now.getTime()
}

function formatCountdown(ms: number) {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${h}h ${m}m`
}

async function fetchPoolDrawing(promptId: string, userId: string): Promise<Drawing | null> {
  // 1. Try a drawing for today's prompt, excluding own submission
  const { data: promptDrawings } = await supabase
    .from('drawings')
    .select('id, strokes')
    .eq('prompt_id', promptId)
    .neq('user_id', userId)
    .limit(50)

  if (promptDrawings && promptDrawings.length > 0) {
    const pick = promptDrawings[Math.floor(Math.random() * promptDrawings.length)]
    console.log('[daily] pool tier 1 hit:', pick.id)
    return pick as Drawing
  }

  // 2. Any drawing from any other prompt, excluding own but keeping seeds (user_id null)
  const { data: anyDrawings } = await supabase
    .from('drawings')
    .select('id, strokes')
    .neq('prompt_id', promptId)
    .or(`user_id.neq.${userId},user_id.is.null`)
    .limit(50)

  if (anyDrawings && anyDrawings.length > 0) {
    const pick = anyDrawings[Math.floor(Math.random() * anyDrawings.length)]
    console.log('[daily] pool tier 2 hit:', pick.id)
    return pick as Drawing
  }

  // 3. Seed drawings (user_id null), any prompt
  const { data: seeds } = await supabase
    .from('drawings')
    .select('id, strokes')
    .is('user_id', null)
    .limit(10)

  if (seeds && seeds.length > 0) {
    const pick = seeds[Math.floor(Math.random() * seeds.length)]
    console.log('[daily] pool tier 3 (seed) hit:', pick.id)
    return pick as Drawing
  }

  return null
}

export function DailyPage() {
  const { user } = useAuth()

  const [phase, setPhase] = useState<Phase>('loading')
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [cut, setCut] = useState<Cut>(DEFAULT_CUT)
  const [targetDrawing, setTargetDrawing] = useState<Drawing | null>(null)
  const [result, setResult] = useState<EvaluationResult | null>(null)
  const [countdown, setCountdown] = useState(msUntilMidnightUTC())
  const [ratingSubmitting, setRatingSubmitting] = useState(false)
  const [todayScore, setTodayScore] = useState<number | null>(null)

  // Countdown ticker for the already-done screen
  useEffect(() => {
    if (phase !== 'already-done' && phase !== 'done') return
    const id = setInterval(() => setCountdown(msUntilMidnightUTC()), 60000)
    return () => clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (!user) return
    async function init() {
      // Get today's prompt
      const today = new Date().toISOString().slice(0, 10)
      const { data: promptData } = await supabase
        .from('prompts')
        .select('id, text')
        .eq('active_date', today)
        .single()

      if (!promptData) { setPhase('no-prompt'); return }
      setPrompt(promptData as Prompt)

      // Lock out if the user has already submitted a drawing for today's prompt.
      // The game links to the *cut* drawing (possibly from another prompt), so
      // checking the user's own drawing submission is the reliable signal.
      const { data: myDrawings } = await supabase
        .from('drawings')
        .select('id')
        .eq('user_id', user!.id)
        .eq('prompt_id', promptData.id)
        .limit(1)

      if (myDrawings && myDrawings.length > 0) {
        const { data: todayGame } = await supabase
          .from('games')
          .select('score')
          .eq('user_id', user!.id)
          .gte('played_at', `${today}T00:00:00Z`)
          .not('drawing_id', 'is', null)
          .order('played_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        setTodayScore(todayGame?.score ?? null)
        setPhase('already-done')
        return
      }

      setPhase('drawing')
    }
    init()
  }, [user])

  async function handleDrawDone(finalStrokes: Stroke[]) {
    if (!user || !prompt) return
    setStrokes(finalStrokes)
    setPhase('saving')

    // Save drawing to pool — this is also the completion lock
    const { data: savedDrawing, error: insertErr } = await supabase
      .from('drawings')
      .insert({ user_id: user.id, prompt_id: prompt.id, strokes: finalStrokes })
      .select('id')
      .single()

    if (insertErr) {
      console.error('Drawing insert failed:', insertErr)
      setPhase('error')
      return
    }

    console.log('[daily] drawing saved:', savedDrawing?.id)

    // Fetch a drawing to cut (after saving own, so we can exclude it)
    const pool = await fetchPoolDrawing(prompt.id, user.id)
    if (!pool) {
      console.error('No drawing available to cut')
      setPhase('error')
      return
    }
    setTargetDrawing(pool)
    setCut(DEFAULT_CUT)
    setPhase('cutting')
  }

  async function handleCutSubmit(r: EvaluationResult) {
    if (!user || !targetDrawing) return
    setResult(r)

    await supabase.from('games').insert({
      user_id: user.id,
      score: Math.round(r.score),
      left_pct: r.leftPercentage,
      right_pct: r.rightPercentage,
      drawing_id: targetDrawing.id,
    })

    setPhase('rating')
  }

  async function handleRatingSubmit(stars: number) {
    if (!user || !targetDrawing) return
    setRatingSubmitting(true)

    await supabase.from('ratings').insert({
      drawing_id: targetDrawing.id,
      rater_id: user.id,
      stars,
    })

    setRatingSubmitting(false)
    setTodayScore(result ? Math.round(result.score) : null)
    setPhase('done')
  }

  if (!user) {
    return (
      <div className="daily-gate">
        <p>Sign in to play the daily challenge.</p>
        <Link to="/auth" className="btn btn--primary">Sign in</Link>
      </div>
    )
  }

  if (phase === 'loading' || phase === 'saving') {
    return <div className="daily-gate"><p>Loading…</p></div>
  }

  if (phase === 'no-prompt') {
    return (
      <div className="daily-gate">
        <p>No challenge today. Check back tomorrow.</p>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="daily-gate">
        <p className="error-msg">Something went wrong saving your drawing. Check the browser console for details.</p>
      </div>
    )
  }

  if (phase === 'already-done' || phase === 'done') {
    return (
      <div className="daily-gate">
        <p className="daily-complete-title">Challenge complete!</p>
        {todayScore !== null && (
          <p className="daily-complete-score">Score: <strong>{todayScore}</strong> / 100</p>
        )}
        <p className="daily-countdown">Next challenge in {formatCountdown(countdown)}</p>
      </div>
    )
  }

  if (phase === 'drawing' && prompt) {
    return (
      <div className="game">
        <p className="daily-prompt">{prompt.text}</p>
        <DrawPhase
          strokes={strokes}
          onStrokesChange={setStrokes}
          onDone={() => handleDrawDone(strokes)}
        />
      </div>
    )
  }

  if (phase === 'cutting' && targetDrawing) {
    return (
      <div className="game">
        <p className="phase-label">Cut</p>
        <CutPhase
          strokes={targetDrawing.strokes}
          cut={cut}
          onCutChange={setCut}
          onSubmit={handleCutSubmit}
        />
      </div>
    )
  }

  if (phase === 'rating' && result && targetDrawing) {
    return (
      <div className="game">
        <ResultPhase
          strokes={targetDrawing.strokes}
          cut={cut}
          result={result}
          onPlayAgain={() => {}}
          hidePlayAgain
        />
        <RatingUI onSubmit={handleRatingSubmit} submitting={ratingSubmitting} />
      </div>
    )
  }

  return null
}
