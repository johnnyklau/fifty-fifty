import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase, supabaseConfigured } from '../lib/supabase'

export function Header() {
  const { user, avatarUrl } = useAuth()
  const [dailyDone, setDailyDone] = useState(false)

  useEffect(() => {
    if (!user || !supabaseConfigured) return
    const today = new Date().toISOString().slice(0, 10)

    async function checkDaily() {
      const { data: prompt } = await supabase
        .from('prompts')
        .select('id')
        .eq('active_date', today)
        .maybeSingle()

      if (!prompt) { setDailyDone(false); return }

      const { data: myDrawing } = await supabase
        .from('drawings')
        .select('id')
        .eq('user_id', user!.id)
        .eq('prompt_id', prompt.id)
        .maybeSingle()

      setDailyDone(Boolean(myDrawing))
    }
    checkDaily()
  }, [user])

  return (
    <header className="site-header">
      <Link to="/" className="site-logo">50/50</Link>
      <nav className="site-nav">
        {user ? (
          <>
            <Link to="/daily" className={`nav-link${dailyDone ? ' nav-link--done' : ''}`}>
              Daily {dailyDone && <span className="daily-check">✓</span>}
            </Link>
            <Link to="/profile" className="header-avatar-btn" aria-label="Profile">
              {avatarUrl
                ? <img src={avatarUrl} className="header-avatar-img" alt="Your avatar" />
                : <span className="header-avatar-placeholder">{user.email?.[0].toUpperCase() ?? '?'}</span>
              }
            </Link>
          </>
        ) : (
          <>
            <Link to="/daily" className="nav-link">Daily</Link>
            <Link to="/auth" className="btn btn--primary btn--sm">Sign in</Link>
          </>
        )}
      </nav>
    </header>
  )
}
