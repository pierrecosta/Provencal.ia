import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './ConnexionPage.css'

export default function ConnexionPage() {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [pseudoInput, setPseudoInput] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as { from?: string })?.from || '/'

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, from])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(pseudoInput, password)
    } catch {
      setError('Identifiant ou mot de passe incorrect')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit} noValidate>
        <h1 ref={headingRef} tabIndex={-1} className="login-card__title">
          Connexion
        </h1>

        <p className="login-card__info">
          Identifiants fournis par l'administrateur
        </p>

        <div className="login-card__field">
          <label htmlFor="login-pseudo">Login</label>
          <input
            id="login-pseudo"
            type="text"
            autoComplete="username"
            value={pseudoInput}
            onChange={(e) => setPseudoInput(e.target.value)}
            required
          />
        </div>

        <div className="login-card__field">
          <label htmlFor="login-password">Mot de passe</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="login-card__submit"
          disabled={loading}
        >
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>

        {error && (
          <p className="login-card__error" role="alert">
            {error}
          </p>
        )}
      </form>
    </div>
  )
}
