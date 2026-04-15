import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../services/api'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import iconOlivier from '../assets/icons/icon-olivier.svg'

interface LibraryItem {
  id: number
  titre: string
  description_courte: string | null
  periode: string | null
  typologie: string | null
}

type FilterType = '' | 'Histoire' | 'Légende'

export default function BibliothequePage() {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [allLoaded, setAllLoaded] = useState(false)

  const [periodes, setPeriodes] = useState<string[]>([])
  const [filterType, setFilterType] = useState<FilterType>('')
  const [filterPeriode, setFilterPeriode] = useState('')
  const [filterLieu, setFilterLieu] = useState('')

  // Reset on filter change
  const prevFilters = useRef({ filterType, filterPeriode, filterLieu })
  useEffect(() => {
    const prev = prevFilters.current
    if (prev.filterType !== filterType || prev.filterPeriode !== filterPeriode || prev.filterLieu !== filterLieu) {
      setItems([])
      setPage(1)
      setHasMore(true)
      setAllLoaded(false)
      prevFilters.current = { filterType, filterPeriode, filterLieu }
    }
  }, [filterType, filterPeriode, filterLieu])

  const loadPage = useCallback(async (p: number) => {
    if (loading) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), per_page: '20' })
      if (filterType) params.set('type', filterType)
      if (filterPeriode) params.set('periode', filterPeriode)
      if (filterLieu) params.set('lieu', filterLieu)
      const resp = await apiFetch(`/api/v1/library?${params}`)
      if (resp.ok) {
        const data = await resp.json()
        setItems(prev => p === 1 ? data.items : [...prev, ...data.items])
        setPage(p)
        const more = p < data.pages
        setHasMore(more)
        if (!more) setAllLoaded(true)
      }
    } finally {
      setLoading(false)
    }
  }, [loading, filterType, filterPeriode, filterLieu])

  useEffect(() => {
    loadPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterPeriode, filterLieu])

  useEffect(() => {
    apiFetch('/api/v1/library/periodes')
      .then(r => r.ok ? r.json() : [])
      .then(setPeriodes)
  }, [])

  const sentinelRef = useInfiniteScroll({
    loading,
    hasMore,
    onLoadMore: () => loadPage(page + 1),
  })

  return (
    <div>
      <h1>Culture</h1>

      {/* Filtres */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', margin: 'var(--space-3) 0' }}>
        {(['', 'Histoire', 'Légende'] as FilterType[]).map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            style={{
              padding: '6px 16px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: filterType === t ? 'var(--color-primary)' : 'none',
              color: filterType === t ? '#fff' : 'var(--color-text)',
              cursor: 'pointer',
              fontWeight: filterType === t ? 700 : 400,
            }}
          >
            {t || 'Tout'}
          </button>
        ))}
        <select value={filterPeriode} onChange={e => setFilterPeriode(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}>
          <option value="">Toutes les périodes</option>
          {periodes.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input
          type="text"
          placeholder="Filtrer par lieu..."
          value={filterLieu}
          onChange={e => setFilterLieu(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}
        />
      </div>

      {/* Liste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {items.map(item => (
          <Link key={item.id} to={`/bibliotheque/${item.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-2) var(--space-3)', background: '#fff' }}>
              <div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center', marginBottom: 4 }}>
                {item.typologie && (
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-secondary)', border: '1px solid var(--color-secondary)', borderRadius: 'var(--radius-sm)', padding: '1px 6px' }}>
                    {item.typologie}
                  </span>
                )}
                {item.periode && (
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text)', opacity: 0.6 }}>{item.periode}</span>
                )}
              </div>
              <h2 style={{ fontSize: 'var(--text-md)', margin: '4px 0' }}>{item.titre}</h2>
              {item.description_courte && (
                <p style={{ fontSize: 'var(--text-sm)', margin: 0, opacity: 0.75, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {item.description_courte}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Sentinel pour le défilement infini */}
      <div ref={sentinelRef} style={{ height: 32 }} />

      {loading && <p style={{ textAlign: 'center' }}>Chargement…</p>}

      {allLoaded && (
        <div style={{ textAlign: 'center', marginTop: 'var(--space-4)', color: 'var(--color-text)', opacity: 0.5 }}>
          <img src={iconOlivier} alt="" width={32} height={32} style={{ display: 'block', margin: '0 auto var(--space-2)' }} />
          <p style={{ fontSize: 'var(--text-sm)' }}>Toutes les histoires ont été chargées.</p>
        </div>
      )}
    </div>
  )
}
