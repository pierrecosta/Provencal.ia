import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, configureApi } from '../services/api'

interface AuthState {
  pseudo: string | null
  token: string | null
  isAuthenticated: boolean
  login: (pseudo: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [pseudo, setPseudo] = useState<string | null>(null)
  const navigate = useNavigate()

  const clearAuth = useCallback(() => {
    setToken(null)
    setPseudo(null)
  }, [])

  useEffect(() => {
    configureApi(
      () => token,
      () => {
        clearAuth()
        navigate('/connexion')
      },
    )
  }, [token, clearAuth, navigate])

  const login = useCallback(
    async (userPseudo: string, password: string) => {
      const response = await apiFetch('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ pseudo: userPseudo, password }),
      })

      if (!response.ok) {
        throw new Error('Identifiant ou mot de passe incorrect')
      }

      const data = await response.json()
      setToken(data.access_token)
      setPseudo(userPseudo)
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/v1/auth/logout', { method: 'POST' })
    } finally {
      clearAuth()
      navigate('/connexion')
    }
  }, [clearAuth, navigate])

  return (
    <AuthContext.Provider
      value={{
        pseudo,
        token,
        isAuthenticated: token !== null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
