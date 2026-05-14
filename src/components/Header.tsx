import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Header() {
  const { user, signOut } = useAuth()

  return (
    <header className="site-header">
      <Link to="/" className="site-logo">50/50</Link>
      <nav className="site-nav">
        {user ? (
          <>
            <Link to="/profile" className="nav-link nav-link--profile">
              Profile
            </Link>
            <button className="btn btn--secondary btn--sm" onClick={signOut}>
              Sign out
            </button>
          </>
        ) : (
          <Link to="/auth" className="btn btn--primary btn--sm">
            Sign in
          </Link>
        )}
      </nav>
    </header>
  )
}
