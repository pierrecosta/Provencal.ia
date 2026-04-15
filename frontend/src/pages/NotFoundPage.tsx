import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
      <h1 ref={headingRef} tabIndex={-1}>
        Page introuvable
      </h1>
      <p style={{ marginTop: 'var(--space-2)' }}>
        La page que vous cherchez n'existe pas.
      </p>
      <Link
        to="/"
        style={{
          display: 'inline-block',
          marginTop: 'var(--space-3)',
          color: 'var(--color-primary)',
        }}
      >
        Retour à l'accueil
      </Link>
    </div>
  )
}
