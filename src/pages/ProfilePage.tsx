import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { AvatarCanvas } from '../components/AvatarCanvas'
import type { AvatarCanvasHandle } from '../components/AvatarCanvas'

interface GameRow {
  score: number
  played_at: string
}

interface Stats {
  gamesPlayed: number
  averageScore: number
  bestScore: number
  perfectCuts: number
  currentStreak: number
  consistency: number
}

function computeStats(games: GameRow[]): Stats {
  if (games.length === 0) {
    return { gamesPlayed: 0, averageScore: 0, bestScore: 0, perfectCuts: 0, currentStreak: 0, consistency: 0 }
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

  return { gamesPlayed, averageScore, bestScore, perfectCuts, currentStreak: streak, consistency }
}

export function ProfilePage() {
  const { user, signOut, avatarUrl, setAvatarUrl } = useAuth()
  const avatarRef = useRef<AvatarCanvasHandle>(null)

  const [username, setUsername] = useState('')
  const [stats, setStats] = useState<Stats | null>(null)
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
      .from('games')
      .select('score, played_at')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setStats(computeStats(data as GameRow[]))
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
                  </tbody>
                </table>
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
