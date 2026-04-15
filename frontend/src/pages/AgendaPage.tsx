import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiFetch } from '../services/api'
import iconArchive from '../assets/icons/icon-archive.svg'
import iconDate from '../assets/icons/icon-date.svg'
import iconLocalite from '../assets/icons/icon-localite.svg'

interface EventItem {
  id: number
  titre: string
  date_debut: string
  date_fin: string
  lieu: string | null
  description: string | null
}

interface Page {
  items: EventItem[]
  total: number
  page: number
  per_page: number
  pages: number
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const EMPTY_EVENT: EventItem = {
  id: 0,
  titre: 'Mise à jour à faire par l\'administrateur',
  date_debut: new Date().toISOString().split('T')[0],
  date_fin: new Date().toISOString().split('T')[0],
  lieu: null,
  description: null,
}

export default function AgendaPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const isArchive = searchParams.get('archive') === 'true'

  const [events, setEvents] = useState<EventItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(false)

  const [lieu, setLieu] = useState('')
  const [annee, setAnnee] = useState('')
  const [mois, setMois] = useState('')

  const fetchEvents = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), per_page: '20' })
      if (isArchive) params.set('archive', 'true')
      if (lieu) params.set('lieu', lieu)
      if (annee) params.set('annee', annee)
      if (mois) params.set('mois', mois)

      const resp = await apiFetch(`/api/v1/events?${params}`)
      if (resp.ok) {
        const data: Page = await resp.json()
        setEvents(data.items)
        setTotal(data.total)
        setPages(data.pages)
        setPage(data.page)
      }
    } finally {
      setLoading(false)
    }
  }, [isArchive, lieu, annee, mois])

  useEffect(() => {
    fetchEvents(1)
  }, [fetchEvents])

  const featured = events.slice(0, 3)
  const rest = events.slice(3)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <h1 style={{ margin: 0 }}>{isArchive ? 'Archives Agenda' : 'Agenda culturel'}</h1>
        {isArchive ? (
          <button
            onClick={() => setSearchParams({})}
            style={{ background: 'none', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-md)', padding: '6px 16px', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}
          >
            ← Événements à venir
          </button>
        ) : (
          <button
            onClick={() => setSearchParams({ archive: 'true' })}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '6px 16px', color: 'var(--color-text)', cursor: 'pointer' }}
          >
            <img src={iconArchive} alt="" width={16} height={16} />
            Archives
          </button>
        )}
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <input
          type="text"
          placeholder="Filtrer par lieu..."
          value={lieu}
          onChange={e => setLieu(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}
        />
        <input
          type="number"
          placeholder="Année"
          value={annee}
          onChange={e => setAnnee(e.target.value)}
          style={{ width: 90, padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}
          min={2000}
          max={2100}
        />
        <select
          value={mois}
          onChange={e => setMois(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}
        >
          <option value="">Tous les mois</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={String(i + 1)}>
              {new Date(2000, i).toLocaleString('fr-FR', { month: 'long' })}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Chargement…</p>}

      {!loading && events.length === 0 && !isArchive && (
        <div>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)', background: '#fff', opacity: 0.6 }}>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>{EMPTY_EVENT.titre}</div>
          </div>
        </div>
      )}

      {/* 3 prochains événements en cartes larges */}
      {!loading && featured.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          {featured.map(ev => (
            <Link
              key={ev.id}
              to={`/agenda/${ev.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)', background: '#fff', height: '100%' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-secondary)', marginBottom: 'var(--space-1)', fontWeight: 600 }}>
                  <img src={iconDate} alt="" width={14} height={14} />
                  {formatDate(ev.date_debut)}
                </div>
                {ev.lieu && (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>
                    <img src={iconLocalite} alt="" width={14} height={14} />
                    {ev.lieu}
                  </div>
                )}
                <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>{ev.titre}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Liste compacte des autres événements */}
      {!loading && rest.length > 0 && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <h2 style={{ marginBottom: 'var(--space-2)' }}>Autres événements</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            {rest.map(ev => (
              <Link key={ev.id} to={`/agenda/${ev.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', padding: 'var(--space-1) 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-secondary)', minWidth: 120 }}>{formatDate(ev.date_debut)}</span>
                  <span style={{ fontWeight: 600 }}>{ev.titre}</span>
                  {ev.lieu && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text)' }}>— {ev.lieu}</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={() => fetchEvents(page - 1)} disabled={page <= 1} style={{ padding: '6px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'none', cursor: page > 1 ? 'pointer' : 'not-allowed' }}>
            ←
          </button>
          <span style={{ fontSize: 'var(--text-sm)' }}>Page {page} / {pages} ({total} événements)</span>
          <button onClick={() => fetchEvents(page + 1)} disabled={page >= pages} style={{ padding: '6px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'none', cursor: page < pages ? 'pointer' : 'not-allowed' }}>
            →
          </button>
        </div>
      )}
    </div>
  )
}
