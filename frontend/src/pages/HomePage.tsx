import { useEffect, useRef, useState, useCallback } from 'react'
import { apiFetch } from '../services/api'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import iconCigale from '../assets/icons/icon-cigale.svg'
import './HomePage.css'

interface Saying {
  id: number
  terme_provencal: string
  localite_origine: string
  traduction_sens_fr: string
  type: string | null
  contexte: string | null
  source: string | null
}

interface PaginatedSayings {
  items: Saying[]
  total: number
  page: number
  per_page: number
  pages: number
}

const TYPES = ['Dicton', 'Expression', 'Proverbe'] as const

export default function HomePage() {
  const headingRef = useRef<HTMLHeadingElement>(null)

  const [todaySaying, setTodaySaying] = useState<Saying | null>(null)
  const [todayLoading, setTodayLoading] = useState(true)
  const [todayError, setTodayError] = useState(false)

  const [items, setItems] = useState<Saying[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [listLoading, setListLoading] = useState(false)

  const [filterType, setFilterType] = useState<string | null>(null)
  const [filterLocalite, setFilterLocalite] = useState('')

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  useEffect(() => {
    let cancelled = false
    setTodayLoading(true)
    setTodayError(false)

    apiFetch('/api/v1/sayings/today')
      .then(async (res) => {
        if (cancelled) return
        if (res.ok) {
          setTodaySaying(await res.json())
        } else {
          setTodayError(true)
        }
      })
      .catch(() => {
        if (!cancelled) setTodayError(true)
      })
      .finally(() => {
        if (!cancelled) setTodayLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  const fetchPage = useCallback(
    async (pageNum: number, type: string | null, localite: string, reset: boolean) => {
      setListLoading(true)
      const params = new URLSearchParams()
      params.set('page', String(pageNum))
      params.set('per_page', '20')
      if (type) params.set('type', type)
      if (localite.trim()) params.set('localite', localite.trim())

      try {
        const res = await apiFetch(`/api/v1/sayings?${params.toString()}`)
        if (!res.ok) return
        const data: PaginatedSayings = await res.json()

        setItems((prev) => (reset ? data.items : [...prev, ...data.items]))
        setHasMore(pageNum < data.pages)
        setPage(pageNum)
      } finally {
        setListLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    void fetchPage(1, filterType, filterLocalite, true)
  }, [filterType, fetchPage])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setHasMore(true)
      void fetchPage(1, filterType, filterLocalite, true)
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [filterLocalite, filterType, fetchPage])

  const loadMore = useCallback(() => {
    if (!listLoading && hasMore) {
      void fetchPage(page + 1, filterType, filterLocalite, false)
    }
  }, [listLoading, hasMore, page, filterType, filterLocalite, fetchPage])

  const sentinelRef = useInfiniteScroll({
    loading: listLoading,
    hasMore,
    onLoadMore: loadMore,
  })

  function handleTypeFilter(type: string | null) {
    setFilterType(type)
    setHasMore(true)
  }

  return (
    <div className="home-page">
      <h1 ref={headingRef} tabIndex={-1} className="sr-only">
        Accueil — Mémoire vivante
      </h1>

      {/* Terme du jour */}
      <section className="today-card" aria-label="Terme du jour">
        {todayLoading && (
          <div className="today-card__loading">
            <span className="spinner" aria-label="Chargement" />
          </div>
        )}
        {todayError && !todayLoading && (
          <p className="today-card__empty">Aucun terme du jour disponible.</p>
        )}
        {todaySaying && !todayLoading && (
          <>
            <p className="today-card__terme">{todaySaying.terme_provencal}</p>
            {todaySaying.type && (
              <span className="today-card__badge">{todaySaying.type}</span>
            )}
            <p className="today-card__localite">{todaySaying.localite_origine}</p>
            <p className="today-card__traduction">{todaySaying.traduction_sens_fr}</p>
          </>
        )}
      </section>

      {/* Filtres */}
      <section className="home-filters" aria-label="Filtres">
        <div className="home-filters__types">
          <button
            className={`home-filters__chip${filterType === null ? ' home-filters__chip--active' : ''}`}
            onClick={() => handleTypeFilter(null)}
          >
            Tout
          </button>
          {TYPES.map((t) => (
            <button
              key={t}
              className={`home-filters__chip${filterType === t ? ' home-filters__chip--active' : ''}`}
              onClick={() => handleTypeFilter(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <input
          className="home-filters__localite"
          type="text"
          placeholder="Filtrer par localité…"
          value={filterLocalite}
          onChange={(e) => setFilterLocalite(e.target.value)}
          aria-label="Filtrer par localité"
        />
      </section>

      {/* Liste des sayings */}
      <section className="sayings-list" aria-label="Liste des dictons, expressions et proverbes">
        {items.map((s) => (
          <article key={s.id} className="saying-card">
            <p className="saying-card__terme">{s.terme_provencal}</p>
            <div className="saying-card__meta">
              {s.type && <span className="saying-card__badge">{s.type}</span>}
              <span className="saying-card__localite">{s.localite_origine}</span>
            </div>
            <p className="saying-card__traduction">{s.traduction_sens_fr}</p>
          </article>
        ))}

        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} className="sayings-list__sentinel" />

        {listLoading && (
          <div className="sayings-list__loading">
            <span className="spinner" aria-label="Chargement" />
          </div>
        )}

        {!hasMore && items.length > 0 && !listLoading && (
          <div className="sayings-list__end">
            <img src={iconCigale} alt="" aria-hidden="true" width={40} height={40} />
            <p>Vous avez parcouru toute la Mémoire vivante</p>
          </div>
        )}

        {!listLoading && items.length === 0 && !hasMore && (
          <p className="sayings-list__empty">Aucun résultat pour ces filtres.</p>
        )}
      </section>
    </div>
  )
}
