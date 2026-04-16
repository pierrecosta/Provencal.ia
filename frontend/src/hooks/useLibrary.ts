import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchLibraryEntries as apiFetchEntries,
  createLibraryEntry as apiCreate,
  updateLibraryEntry as apiUpdate,
  deleteLibraryEntry as apiDelete,
  rollbackLibraryEntry as apiRollback,
} from '../services/libraryService'
import type { LibraryEntry, LibraryBody } from '../services/types'
import { useInfiniteScroll } from './useInfiniteScroll'

type FilterType = '' | 'Histoire' | 'Légende'

export interface UseLibraryReturn {
  entries: LibraryEntry[]
  page: number
  hasMore: boolean
  loading: boolean
  allLoaded: boolean
  filterType: FilterType
  filterPeriode: string
  filterLieu: string
  sentinelRef: React.RefObject<HTMLDivElement | null>
  setFilterType: (t: FilterType) => void
  setFilterPeriode: (v: string) => void
  setFilterLieu: (v: string) => void
  loadPage: (p: number) => Promise<void>
  createEntry: (data: LibraryBody) => Promise<LibraryEntry>
  updateEntry: (id: number, data: LibraryBody) => Promise<LibraryEntry>
  deleteEntry: (id: number) => Promise<void>
  rollbackEntry: (id: number) => Promise<LibraryEntry>
  replaceEntry: (e: LibraryEntry) => void
  removeEntry: (id: number) => void
  resetAndLoad: () => void
}

export function useLibrary(): UseLibraryReturn {
  const [entries, setEntries] = useState<LibraryEntry[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [allLoaded, setAllLoaded] = useState(false)

  const [filterType, setFilterTypeState] = useState<FilterType>('')
  const [filterPeriode, setFilterPeriode] = useState('')
  const [filterLieu, setFilterLieu] = useState('')

  const prevFilters = useRef({ filterType, filterPeriode, filterLieu })
  useEffect(() => {
    const prev = prevFilters.current
    if (
      prev.filterType !== filterType ||
      prev.filterPeriode !== filterPeriode ||
      prev.filterLieu !== filterLieu
    ) {
      setEntries([])
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
      const data = await apiFetchEntries({
        page: p,
        per_page: 20,
        type: filterType || undefined,
        periode: filterPeriode || undefined,
        lieu: filterLieu || undefined,
      })
      setEntries((prev) => (p === 1 ? data.items : [...prev, ...data.items]))
      setPage(p)
      const more = p < data.pages
      setHasMore(more)
      if (!more) setAllLoaded(true)
    } catch {
      // Erreur réseau — liste inchangée
    } finally {
      setLoading(false)
    }
  }, [loading, filterType, filterPeriode, filterLieu])

  useEffect(() => {
    void loadPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterPeriode, filterLieu])

  const loadMore = useCallback(() => {
    void loadPage(page + 1)
  }, [loadPage, page])

  const sentinelRef = useInfiniteScroll({ loading, hasMore, onLoadMore: loadMore })

  const createEntry = useCallback((data: LibraryBody) => apiCreate(data), [])
  const updateEntry = useCallback((id: number, data: LibraryBody) => apiUpdate(id, data), [])
  const deleteEntry = useCallback((id: number) => apiDelete(id), [])
  const rollbackEntry = useCallback((id: number) => apiRollback(id), [])

  const replaceEntry = useCallback(
    (e: LibraryEntry) => setEntries((prev) => prev.map((x) => (x.id === e.id ? e : x))),
    [],
  )
  const removeEntry = useCallback(
    (id: number) => setEntries((prev) => prev.filter((x) => x.id !== id)),
    [],
  )

  const resetAndLoad = useCallback(() => {
    setEntries([])
    setPage(1)
    setHasMore(true)
    setAllLoaded(false)
    void loadPage(1)
  }, [loadPage])

  const setFilterType = useCallback((t: FilterType) => setFilterTypeState(t), [])

  return {
    entries, page, hasMore, loading, allLoaded,
    filterType, filterPeriode, filterLieu,
    sentinelRef,
    setFilterType, setFilterPeriode, setFilterLieu,
    loadPage,
    createEntry, updateEntry, deleteEntry, rollbackEntry,
    replaceEntry, removeEntry,
    resetAndLoad,
  }
}
