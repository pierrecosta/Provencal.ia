import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'

const WARN_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

interface SessionWarningProps {
  isEditFormOpen: boolean
}

export default function SessionWarning({ isEditFormOpen }: SessionWarningProps) {
  const { token, isAuthenticated } = useAuth()
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !token || !isEditFormOpen) {
      setMinutesLeft(null)
      return
    }

    const checkExpiry = () => {
      const expiry = getTokenExpiry(token)
      if (expiry === null) return

      const remaining = expiry - Date.now()
      if (remaining <= WARN_THRESHOLD_MS && remaining > 0) {
        setMinutesLeft(Math.ceil(remaining / 60000))
      } else {
        setMinutesLeft(null)
      }
    }

    checkExpiry()
    const interval = setInterval(checkExpiry, 30000)
    return () => clearInterval(interval)
  }, [token, isAuthenticated, isEditFormOpen])

  if (minutesLeft === null) return null

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        background: 'var(--color-secondary)',
        color: '#fff',
        padding: 'var(--space-1) var(--space-3)',
        textAlign: 'center',
        fontSize: 'var(--text-sm)',
        fontWeight: 600,
      }}
    >
      Votre session expire dans {minutesLeft} minute{minutesLeft > 1 ? 's' : ''}. Enregistrez vos
      modifications pour ne pas les perdre.
    </div>
  )
}
