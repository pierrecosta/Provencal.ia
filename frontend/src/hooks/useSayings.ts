import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchTodaySaying as apiTodaySaying,
  fetchSayings as apiFetchSayings,
  createSaying as apiCreate,
  updateSaying as apiUpdate,
  deleteSaying as apiDelete,
} from '../services/sayingsService'
import type { Saying, SayingCreate, SayingUpdate } from '../services/types'
import { useInfiniteScroll } from './useInfiniteScroll'

export interface UseSayingsReturn {
  todaySaying: Saying | null
  todayLoading: boolean
  todayError: boolean
  sayings: Saying[]
  hasMore: boolean
  listLoading: boolean
  filterType: string | null
  filterLocalite: string
  sentinelRef: React.RefObject<HTMLDivElement | null>
  setFilterType: (t: string | null) => void
  setFilterLocalite: (l: string) => void
  createSaying: (data: SayingCreate) => Promise<Saying>
  updateSaying: (id: number, data: SayingUpdate) => Promise<Saying>
  deleteSaying: (id: number) => Promise<void>
  addSaying: (s: Saying) => void
  replaceSaying: (s: Saying) => void
  removeSaying: (id: number) => void
}

export function useSayings(): UseSayingsReturn {
  const [todaySaying, setTodaySaying] = useState<Saying | null>(null)
  const [todayLoading, setTodayLoading] = useState(true)
  const [todayError, setTodayError] = useState(false)

  const [sayings, setSayings] = useState<Saying[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [listLoading, setListLoading] = useState(false)

  const [filterType, setFilterTypeState] = useState<string | null>(null)
  const [filterLocalite, setFilterLocaliteState] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    let cancelled = false
    setTodayLoading(true)
    setTodayError(false)
    apiTodaySaying()
      .then((data) => { if (!cancelled) setTodaySaying(data) })
      .catch(() => { if (!cancelled) setTodayError(true) })
      .finally(() => { if (!cancelled) setTodayLoading(false) })
    return () => { cancelled = true }
  }, [])

  const fetchPage = useCallback(
    async (pageNum: number, type: string | null, localite: string, reset: boolean) => {
      setListLoading(true)
      try {
        const data = await apiFetchSayings({
          page: pageNum,
          per_page: 20,
          type: type ?? undefined,
          localite: localite.trim() || undefined,
        })
        setSayings((prev) => (reset ? data.items : [...prev, ...data.items]))
        setHasMore(pageNum < data.pages)
        setPage(pageNum)
      } catch {
        // Erreur réseau — ne pas mettre à jour la liste
      } finally {
        setListLoading(false)
      }
    },
    [],
  )

  const setFilterType = useCallback((t: string | null) => {
    setFilterTypeState(t)
    setHasMore(true)
  }, [])

  const setFilterLocalite = useCallback((l: string) => {
    setFilterLocaliteState(l)
  }, [])

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

  const sentinelRef = useInfiniteScroll({ loading: listLoading, hasMore, onLoadMore: loadMore })

  const createSaying = useCallback((data: SayingCreate) => apiCreate(data), [])
  const updateSaying = useCallback((id: number, data: SayingUpdate) => apiUpdate(id, data), [])
  const deleteSaying = useCallback((id: number) => apiDelete(id), [])

  const addSaying = useCallback((s: Saying) => setSayings((prev) => [s, ...prev]), [])
  const replaceSaying = useCallback((s: Saying) => setSayings((prev) => prev.map((x) => (x.id === s.id ? s : x))), [])
  const removeSaying = useCallback((id: number) => setSayings((prev) => prev.filter((x) => x.id !== id)), [])

  return {
    todaySaying, todayLoading, todayError,
    sayings, hasMore, listLoading,
    filterType, filterLocalite,
    sentinelRef,
    setFilterType, setFilterLocalite,
    createSaying, updateSaying, deleteSaying,
    addSaying, replaceSaying, removeSaying,
  }
}
