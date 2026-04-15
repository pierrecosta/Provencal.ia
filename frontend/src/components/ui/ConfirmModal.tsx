import { useEffect, useRef } from 'react'
import './ConfirmModal.css'

interface ConfirmModalProps {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({ message, onConfirm, onCancel }: ConfirmModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) {
      dialog.showModal()
    }
    confirmRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <dialog ref={dialogRef} className="confirm-modal" onClose={onCancel}>
      <div className="confirm-modal__content">
        <p className="confirm-modal__message">{message}</p>
        <div className="confirm-modal__actions">
          <button
            className="confirm-modal__btn confirm-modal__btn--cancel"
            onClick={onCancel}
          >
            Annuler
          </button>
          <button
            ref={confirmRef}
            className="confirm-modal__btn confirm-modal__btn--confirm"
            onClick={onConfirm}
          >
            Confirmer
          </button>
        </div>
      </div>
    </dialog>
  )
}
