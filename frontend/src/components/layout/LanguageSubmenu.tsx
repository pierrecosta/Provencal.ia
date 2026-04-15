import { useEffect, useRef, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import iconDictionnaire from '../../assets/icons/icon-dictionnaire.svg'
import iconTraducteur from '../../assets/icons/icon-traducteur.svg'
import './LanguageSubmenu.css'

interface LanguageSubmenuProps {
  open: boolean
  onClose: () => void
  mode: 'desktop' | 'mobile'
}

export default function LanguageSubmenu({ open, onClose, mode }: LanguageSubmenuProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (mode === 'mobile') {
      const dialog = dialogRef.current
      if (!dialog) return

      if (open) {
        dialog.showModal()
      } else {
        dialog.close()
      }
    }
  }, [open, mode])

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  useEffect(() => {
    if (mode !== 'desktop' || !open) return

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, onClose, mode])

  const links = (
    <>
      <NavLink
        to="/dictionnaire"
        className="language-submenu__link"
        aria-label="Dictionnaire"
        onClick={onClose}
      >
        <img src={iconDictionnaire} alt="" aria-hidden="true" width={24} height={24} />
        <span>Dictionnaire</span>
      </NavLink>
      <NavLink
        to="/traducteur"
        className="language-submenu__link"
        aria-label="Traducteur"
        onClick={onClose}
      >
        <img src={iconTraducteur} alt="" aria-hidden="true" width={24} height={24} />
        <span>Traducteur</span>
      </NavLink>
    </>
  )

  if (mode === 'mobile') {
    return (
      <dialog
        ref={dialogRef}
        className="language-submenu language-submenu--mobile"
        aria-label="Sous-menu Langue"
        onClick={(e) => {
          if (e.target === dialogRef.current) onClose()
        }}
      >
        <div className="language-submenu__sheet">
          <div className="language-submenu__header">
            <span className="language-submenu__title">Langue</span>
            <button
              className="language-submenu__close"
              onClick={onClose}
              aria-label="Fermer le sous-menu"
            >
              ×
            </button>
          </div>
          <nav className="language-submenu__nav">{links}</nav>
        </div>
      </dialog>
    )
  }

  if (!open) return null

  return (
    <div ref={containerRef} className="language-submenu language-submenu--desktop" role="menu">
      <nav className="language-submenu__nav">{links}</nav>
    </div>
  )
}
