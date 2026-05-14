import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { AvatarCanvas } from '../components/AvatarCanvas'
import type { AvatarCanvasHandle } from '../components/AvatarCanvas'
import { DrawingThumbnail } from '../components/DrawingThumbnail'
import type { Stroke } from '../types'

interface GameRow {
  score: number
  played_at: string
}

interface SubmittedDrawing {
  id: string
  submitted_at: string
  strokes: Stroke[]
  prompt: string
  avgStars: number | null
}

interface Stats {
  gamesPlayed: number
  averageScore: number
  bestScore: number
  perfectCuts: number
  currentStreak: number
  consistency: number
  avgDrawingRank: number | null
}

function computeStats(games: GameRow[], avgDrawingRank: number | null = null): Stats {
  if (games.length === 0) {
    return { gamesPlayed: 0, averageScore: 0, bestScore: 0, perfectCuts: 0, currentStreak: 0, consistency: 0, avgDrawingRank }
  }

  const scores = games.map(g => g.score)
  const gamesPlayed = games.length
  const averageScore = scores.reduce((a, b) => a + b, 0) / gamesPlayed
  const bestScore = Math.max(...scores)
  const perfectCuts = scores.filter(s => s === 100).length

  const mean = averageScore
  const variance = scores.reduce((acc, s) => acc + (s - mean) ** 2, 0) / gamesPlayed
  const consistency = Math.sqrt(variance)

  const playedDays = new Set(
    games.map(g => new Date(g.played_at).toISOString().slice(0, 10))
  )
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    if (playedDays.has(key)) {
      streak++
    } else if (i > 0) {
      break
    }
  }

  return { gamesPlayed, averageScore, bestScore, perfectCuts, currentStreak: streak, consistency, avgDrawingRank }
}

export function ProfilePage() {
  const { user, signOut, avatarUrl, setAvatarUrl } = useAuth()
  const avatarRef = useRef<AvatarCanvasHandle>(null)

  const [username, setUsername] = useState('')
  const [stats, setStats] = useState<Stats | null>(null)
  const [submittedDrawings, setSubmittedDrawings] = useState<SubmittedDrawing[]>([])
  const [editing, setEditing] = useState(false)
  const [drawingAvatar, setDrawingAvatar] = useState(false)
  const [editUsername, setEditUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.username) setUsername(data.username)
      })

    supabase
      .from('drawings')
      .select('id, submitted_at, strokes, prompts(text), ratings(stars)')
      .eq('user_id', user.id)
      .not('prompt_id', 'is', null)
      .order('submitted_at', { ascending: false })
      .then(({ data }) => {
        if (!data) return
        setSubmittedDrawings(data.map(d => {
          const stars = (d.ratings as { stars: number }[]).map(r => r.stars)
          return {
            id: d.id as string,
            submitted_at: d.submitted_at as string,
            strokes: d.strokes as Stroke[],
            prompt: (d.prompts as { text: string } | null)?.text ?? '',
            avgStars: stars.length > 0 ? stars.reduce((a, b) => a + b, 0) / stars.length : null,
          }
        }))
      })

    supabase
      .from('games')
      .select('score, played_at')
      .eq('user_id', user.id)
      .then(async ({ data: games }) => {
        if (!games) return
        const { data: ratings } = await supabase
          .from('ratings')
          .select('stars, drawings!inner(user_id)')
          .eq('drawings.user_id', user!.id)
        const avgRank = ratings && ratings.length > 0
          ? ratings.reduce((sum, r) => sum + (r as { stars: number }).stars, 0) / ratings.length
          : null
        setStats(computeStats(games as GameRow[], avgRank))
      })
  }, [user])

  function handleEdit() {
    setEditUsername(username)
    setDrawingAvatar(false)
    setError(null)
    setEditing(true)
  }

  function handleCancel() {
    setEditing(false)
    setDrawingAvatar(false)
    setError(null)
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    setError(null)

    let newAvatarUrl = avatarUrl

    if (drawingAvatar && avatarRef.current) {
      const dataUrl = avatarRef.current.toDataURL()
      const blob = await (await fetch(dataUrl)).blob()
      const path = `${user.id}/avatar.png`
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/png' })

      if (uploadErr) {
        setSaving(false)
        setError(`Avatar upload failed: ${uploadErr.message}`)
        return
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      newAvatarUrl = `${data.publicUrl}?t=${Date.now()}`
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ username: editUsername || null, avatar_url: newAvatarUrl })
      .eq('id', user.id)

    setSaving(false)

    if (updateErr) {
      setError(updateErr.message)
      return
    }

    setUsername(editUsername)
    setAvatarUrl(newAvatarUrl)
    setEditing(false)
    setDrawingAvatar(false)
  }

  if (!user) return null

  const displayName = username || user.email

  return (
    <div className="profile-page">
      <div className="profile-card">

        {!editing ? (
          <>
            <div className="profile-display">
              <div className="profile-avatar-large">
                {avatarUrl
                  ? <img src={avatarUrl} alt="Your avatar" className="profile-avatar-img-large" />
                  : <span className="profile-avatar-initials">{displayName?.[0].toUpperCase() ?? '?'}</span>
                }
              </div>
              <p className="profile-display-name">{displayName}</p>
              <div className="profile-display-actions">
                <button className="btn btn--secondary" onClick={handleEdit}>Edit profile</button>
                <button className="btn btn--secondary" onClick={signOut}>Sign out</button>
              </div>
            </div>

            {stats && (
              <div className="profile-stats">
                <h2 className="profile-stats-title">Stats</h2>
                <table className="stats-table">
                  <tbody>
                    <tr><td>Games played</td><td>{stats.gamesPlayed}</td></tr>
                    <tr><td>Average score</td><td>{stats.averageScore.toFixed(1)}</td></tr>
                    <tr><td>Best score</td><td>{stats.bestScore}</td></tr>
                    <tr><td>Perfect cuts</td><td>{stats.perfectCuts}</td></tr>
                    <tr><td>Current streak</td><td>{stats.currentStreak} {stats.currentStreak === 1 ? 'day' : 'days'}</td></tr>
                    <tr><td>Consistency</td><td>±{stats.consistency.toFixed(1)}</td></tr>
                {stats.avgDrawingRank !== null && (
                  <tr><td>Avg drawing rank</td><td>{stats.avgDrawingRank.toFixed(1)} / 5</td></tr>
                )}
                  </tbody>
                </table>
              </div>
            )}
            {submittedDrawings.length > 0 && (
              <div className="profile-drawings">
                <h2 className="profile-stats-title">Submitted Drawings</h2>
                <div className="drawings-grid">
                  {submittedDrawings.map(d => (
                    <div key={d.id} className="drawing-card">
                      <DrawingThumbnail strokes={d.strokes} />
                      <div className="drawing-card-meta">
                        <span className="drawing-card-prompt">{d.prompt}</span>
                        <span className="drawing-card-date">
                          {new Date(d.submitted_at).toLocaleDateString()}
                        </span>
                        {d.avgStars !== null && (
                          <span className="drawing-card-stars">
                            {'★'.repeat(Math.round(d.avgStars))}{'☆'.repeat(5 - Math.round(d.avgStars))}
                            {' '}{d.avgStars.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="profile-editor">
            <div className="profile-avatar-section">
              {drawingAvatar ? (
                <AvatarCanvas ref={avatarRef} />
              ) : (
                <div className="profile-avatar-preview">
                  {avatarUrl
                    ? <img src={avatarUrl} alt="Current avatar" className="profile-avatar-img-large" />
                    : <span className="profile-avatar-initials">{displayName?.[0].toUpperCase() ?? '?'}</span>
                  }
                  <button className="btn btn--secondary" onClick={() => setDrawingAvatar(true)}>
                    {avatarUrl ? 'Redraw avatar' : 'Draw your avatar'}
                  </button>
                </div>
              )}
            </div>

            <label className="auth-label">
              Display name
              <input
                type="text"
                value={editUsername}
                onChange={e => setEditUsername(e.target.value)}
                className="auth-input"
                placeholder="Choose a username"
              />
            </label>

            {error && <p className="error-msg">{error}</p>}

            <div className="profile-editor-actions">
              <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="btn btn--secondary" onClick={handleCancel} disabled={saving}>
                Cancel
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
