import { useEffect } from 'react'
import './Snackbar.css'

interface SnackbarProps {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}

export default function Snackbar({ message, type, onClose }: SnackbarProps) {
  useEffect(() => {
    const duration = type === 'success' ? 3000 : 4000
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [type, onClose])

  return (
    <div
      className={`snackbar snackbar--${type}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  )
}
