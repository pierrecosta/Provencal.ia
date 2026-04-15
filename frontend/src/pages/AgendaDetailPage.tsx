import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiFetch } from '../services/api'
import Breadcrumb from '../components/ui/Breadcrumb'
import BackButton from '../components/ui/BackButton'
import iconLienExterne from '../assets/icons/icon-lien-externe.svg'

interface EventDetail {
  id: number
  titre: string
  date_debut: string
  date_fin: string
  lieu: string | null
  description: string | null
  lien_externe: string | null
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function AgendaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    apiFetch(`/api/v1/events/${id}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setEvent)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p>Chargement…</p>
  if (error || !event) return <p>Événement introuvable.</p>

  const sameDay = event.date_debut === event.date_fin

  return (
    <div>
      <BackButton />
      <Breadcrumb
        items={[
          { label: 'Accueil', path: '/' },
          { label: 'Agenda', path: '/agenda' },
          { label: event.titre },
        ]}
      />

      {/* Bande supérieure terracotta */}
      <div
        style={{
          background: 'var(--color-secondary)',
          color: '#fff',
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 'var(--space-3)',
        }}
      >
        <h1 style={{ color: '#fff', marginBottom: 'var(--space-1)' }}>{event.titre}</h1>
        <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
          {sameDay
            ? formatDate(event.date_debut)
            : `${formatDate(event.date_debut)} – ${formatDate(event.date_fin)}`}
          {event.lieu && ` · ${event.lieu}`}
        </p>
      </div>

      {/* Description */}
      {event.description && (
        <p style={{ maxWidth: 'var(--container-text-max)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
          {event.description}
        </p>
      )}

      {/* Lien externe */}
      {event.lien_externe && (
        <a
          href={event.lien_externe}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: 'var(--space-3)',
            padding: '8px 16px',
            border: '1px solid var(--color-primary)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-primary)',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          <img src={iconLienExterne} alt="" width={16} height={16} />
          En savoir plus
        </a>
      )}
    </div>
  )
}
