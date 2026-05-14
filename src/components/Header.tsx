import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Header() {
  const { user, avatarUrl } = useAuth()

  return (
    <header className="site-header">
      <Link to="/" className="site-logo">50/50</Link>
      <nav className="site-nav">
        {user ? (
          <Link to="/profile" className="header-avatar-btn" aria-label="Profile">
            {avatarUrl
              ? <img src={avatarUrl} className="header-avatar-img" alt="Your avatar" />
              : <span className="header-avatar-placeholder">{user.email?.[0].toUpperCase() ?? '?'}</span>
            }
          </Link>
        ) : (
          <Link to="/auth" className="btn btn--primary btn--sm">
            Sign in
          </Link>
        )}
      </nav>
    </header>
  )
}
