import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConfirmModal from '../ConfirmModal'

describe('ConfirmModal', () => {
  const defaultProps = {
    message: 'Voulez-vous supprimer cet élément ?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche le message passé en prop', () => {
    render(<ConfirmModal {...defaultProps} />)
    expect(screen.getByText(defaultProps.message)).toBeInTheDocument()
  })

  it('appelle onConfirm au clic sur Confirmer', () => {
    render(<ConfirmModal {...defaultProps} />)
    fireEvent.click(screen.getByText('Confirmer'))
    expect(defaultProps.onConfirm).toHaveBeenCalledOnce()
  })

  it('appelle onCancel au clic sur Annuler', () => {
    render(<ConfirmModal {...defaultProps} />)
    fireEvent.click(screen.getByText('Annuler'))
    expect(defaultProps.onCancel).toHaveBeenCalledOnce()
  })

  it('appelle onCancel sur touche Escape', () => {
    render(<ConfirmModal {...defaultProps} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(defaultProps.onCancel).toHaveBeenCalledOnce()
  })
})
