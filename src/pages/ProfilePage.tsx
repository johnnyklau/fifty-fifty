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

  // streak: consecutive calendar days with at least one game, counting back from today
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
  const { user, signOut } = useAuth()
  const avatarRef = useRef<AvatarCanvasHandle>(null)

  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [showCanvas, setShowCanvas] = useState(false)

  useEffect(() => {
    if (!user) return

    supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.username) setUsername(data.username)
        if (data?.avatar_url) setAvatarUrl(data.avatar_url)
      })

    supabase
      .from('games')
      .select('score, played_at')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setStats(computeStats(data as GameRow[]))
      })
  }, [user])

  async function handleSaveProfile() {
    if (!user) return
    setSaving(true)
    setSaveMsg(null)

    let newAvatarUrl = avatarUrl

    if (showCanvas && avatarRef.current) {
      const dataUrl = avatarRef.current.toDataURL()
      const blob = await (await fetch(dataUrl)).blob()
      const path = `${user.id}/avatar.png`
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/png' })

      if (!uploadErr) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        newAvatarUrl = data.publicUrl
      }
    }

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      username: username || null,
      avatar_url: newAvatarUrl,
    })

    setSaving(false)
    if (error) {
      setSaveMsg(error.message)
    } else {
      setAvatarUrl(newAvatarUrl)
      setShowCanvas(false)
      setSaveMsg('Profile saved.')
    }
  }

  if (!user) return null

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-avatar-section">
          {avatarUrl && !showCanvas && (
            <img src={avatarUrl} alt="Your avatar" className="profile-avatar-img" />
          )}
          {showCanvas ? (
            <AvatarCanvas ref={avatarRef} />
          ) : (
            <button className="btn btn--secondary" onClick={() => setShowCanvas(true)}>
              {avatarUrl ? 'Redraw avatar' : 'Draw your avatar'}
            </button>
          )}
        </div>

        <div className="profile-fields">
          <label className="auth-label">
            Display name
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="auth-input"
              placeholder="Choose a username"
            />
          </label>

          {saveMsg && <p className={saveMsg === 'Profile saved.' ? 'auth-success' : 'error-msg'}>{saveMsg}</p>}

          <button className="btn btn--primary" onClick={handleSaveProfile} disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
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

        <button className="btn btn--secondary" style={{ alignSelf: 'flex-start', marginTop: 8 }} onClick={signOut}>
          Sign out
        </button>
      </div>
    </div>
  )
}
