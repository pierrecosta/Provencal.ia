import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer
      style={{
        display: 'none',
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-bg)',
        padding: 'var(--space-2) var(--space-3)',
        fontSize: 'var(--text-xs)',
        color: 'var(--color-text)',
        textAlign: 'center',
      }}
      className="footer-desktop"
    >
      <span>
        Sources lexicographiques : Garcin (1823) · Autran · Achard (1785) · Honnorat (1846) · Avril
        (1834) · Pellas (1723) · Fourvières (1901)
      </span>
      {' — '}
      <Link to="/mentions-legales" style={{ color: 'var(--color-primary)' }}>
        Mentions légales
      </Link>
    </footer>
  )
}
