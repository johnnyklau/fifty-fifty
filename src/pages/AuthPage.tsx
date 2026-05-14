import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

type Mode = 'signin' | 'signup'

export function AuthPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const fn = mode === 'signin' ? signIn : signUp
    const { error } = await fn(email, password)

    setLoading(false)

    if (error) {
      setError(error)
      return
    }

    if (mode === 'signup') {
      setSuccess('Check your email to confirm your account.')
      return
    }

    navigate('/')
  }

  async function handleGoogle() {
    setError(null)
    const { error } = await signInWithGoogle()
    if (error) setError(error)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">{mode === 'signin' ? 'Sign in' : 'Create account'}</h1>

        {success ? (
          <p className="auth-success">{success}</p>
        ) : (
          <>
            <button className="btn btn--google" onClick={handleGoogle}>
              Continue with Google
            </button>

            <div className="auth-divider"><span>or</span></div>

            <form onSubmit={handleSubmit} className="auth-form">
              <label className="auth-label">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="auth-input"
                  required
                />
              </label>
              <label className="auth-label">
                Password
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="auth-input"
                  required
                  minLength={6}
                />
              </label>
              {error && <p className="error-msg">{error}</p>}
              <button type="submit" className="btn btn--primary" disabled={loading}>
                {loading ? 'Loading…' : mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <p className="auth-switch">
              {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                className="auth-switch-btn"
                onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(null) }}
              >
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
