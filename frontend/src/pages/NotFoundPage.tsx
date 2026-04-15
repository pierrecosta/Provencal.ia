import { Link } from 'react-router-dom'

const LINKS = [
  { label: 'Accueil', path: '/' },
  { label: 'Dictionnaire', path: '/dictionnaire' },
  { label: 'Agenda', path: '/agenda' },
  { label: 'Bibliothèque', path: '/bibliotheque' },
]

export default function NotFoundPage() {
  return (
    <div style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
      <h1>Page introuvable</h1>
      <p style={{ marginTop: 'var(--space-2)', color: 'var(--color-text)' }}>
        La page que vous recherchez n'existe pas ou a été déplacée.
      </p>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 'var(--space-2)',
          marginTop: 'var(--space-4)',
        }}
      >
        {LINKS.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            style={{
              display: 'inline-block',
              padding: 'var(--space-1) var(--space-3)',
              border: '1px solid var(--color-primary)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-primary)',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
