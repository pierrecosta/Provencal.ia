import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import Snackbar from '../Snackbar'

describe('Snackbar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('affiche le texte du message', () => {
    render(<Snackbar message="Opération réussie" type="success" onClose={vi.fn()} />)
    expect(screen.getByText('Opération réussie')).toBeInTheDocument()
  })

  it('appelle onClose après 3 secondes pour type success', () => {
    const onClose = vi.fn()
    render(<Snackbar message="Succès" type="success" onClose={onClose} />)
    act(() => vi.advanceTimersByTime(3000))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('appelle onClose après 4 secondes pour type error', () => {
    const onClose = vi.fn()
    render(<Snackbar message="Erreur" type="error" onClose={onClose} />)
    act(() => vi.advanceTimersByTime(3999))
    expect(onClose).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
