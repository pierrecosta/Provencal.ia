import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { apiFetch } from '../services/api'
import Breadcrumb from '../components/ui/Breadcrumb'
import BackButton from '../components/ui/BackButton'
import iconToggleLangue from '../assets/icons/icon-toggle-langue.svg'
import iconLienExterne from '../assets/icons/icon-lien-externe.svg'

interface LibraryDetail {
  id: number
  titre: string
  description_courte: string | null
  description_longue: string | null
  periode: string | null
  typologie: string | null
  source_url: string | null
  image_ref: string | null
  lang: string | null
  traduction_id: number | null
  has_translation: boolean
  translation_lang: string | null
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function BibliothequeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [entry, setEntry] = useState<LibraryDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const loadEntry = (entryId: string | number) => {
    setLoading(true)
    apiFetch(`/api/v1/library/${entryId}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then((data: LibraryDetail) => setEntry(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (id) loadEntry(id)
  }, [id])

  if (loading) return <p>Chargement…</p>
  if (error || !entry) return <p>Entrée introuvable.</p>

  const imageUrl = entry.image_ref ? `${API_BASE}/static/images/${entry.image_ref}` : null

  return (
    <div style={{ maxWidth: 'var(--container-text-max)', margin: '0 auto' }}>
      <BackButton />
      <Breadcrumb
        items={[
          { label: 'Accueil', path: '/' },
          { label: 'Culture', path: '/bibliotheque' },
          { label: entry.titre },
        ]}
      />

      {/* Titre et badges */}
      <h1 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>{entry.titre}</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)', marginBottom: 'var(--space-3)' }}>
        {entry.typologie && (
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-secondary)', border: '1px solid var(--color-secondary)', borderRadius: 'var(--radius-sm)', padding: '2px 8px' }}>
            {entry.typologie}
          </span>
        )}
        {entry.periode && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text)', background: 'var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '2px 8px' }}>
            {entry.periode}
          </span>
        )}
        {entry.lang && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text)', background: 'var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '2px 8px' }}>
            {entry.lang.toUpperCase()}
          </span>
        )}
      </div>

      {/* Toggle FR/Provençal */}
      {entry.has_translation && entry.traduction_id && (
        <button
          onClick={() => loadEntry(entry.traduction_id!)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-3)', padding: '8px 16px', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-md)', background: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}
        >
          <img src={iconToggleLangue} alt="" width={16} height={16} />
          Voir la version {entry.translation_lang === 'oc' ? 'provençale' : 'française'}
        </button>
      )}

      {/* Image */}
      {imageUrl && (
        <div style={{ width: '100%', maxHeight: 300, overflow: 'hidden', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-3)' }}>
          <img src={imageUrl} alt="" style={{ width: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {/* Description longue (Markdown) */}
      {entry.description_longue && (
        <div style={{ lineHeight: 1.8 }}>
          <ReactMarkdown>{entry.description_longue}</ReactMarkdown>
        </div>
      )}

      {/* Lien source */}
      {entry.source_url && (
        <a
          href={entry.source_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: 'var(--space-3)', padding: '8px 16px', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-md)', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}
        >
          <img src={iconLienExterne} alt="" width={16} height={16} />
          Source
        </a>
      )}
    </div>
  )
}
