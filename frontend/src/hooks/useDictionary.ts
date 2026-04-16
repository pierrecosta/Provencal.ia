import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchThemes, searchDictionary, searchProvencal } from '../services/dictionaryService'
import type { DictEntry, ThemeCategories } from '../services/types'

type Direction = 'fr_to_oc' | 'oc_to_fr'

const PER_PAGE_OPTIONS = [10, 20, 50, 100]

export interface UseDictionaryReturn {
  direction: Direction
  q: string
  theme: string
  categorie: string
  graphie: string
  source: string
  page: number
  perPage: number
  results: DictEntry[]
  total: number
  totalPages: number
  suggestions: string[]
  loading: boolean
  themesMap: ThemeCategories
  categories: string[]
  filtersDisabled: boolean
  perPageOptions: readonly number[]
  handleQ: (v: string) => void
  handleTheme: (v: string) => void
  handleCategorie: (v: string) => void
  handleGraphie: (v: string) => void
  handleSource: (v: string) => void
  handlePerPage: (v: number) => void
  handleDirection: (d: Direction) => void
  setPage: (p: number) => void
  refresh: () => void
}

export function useDictionary(): UseDictionaryReturn {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [direction, setDirection] = useState<Direction>('fr_to_oc')
  const [q, setQ] = useState('')
  const [theme, setTheme] = useState('')
  const [categorie, setCategorie] = useState('')
  const [graphie, setGraphie] = useState('')
  const [source, setSource] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)

  const [results, setResults] = useState<DictEntry[]>([])
  const [total, setTotal] = useState(0)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const [themesMap, setThemesMap] = useState<ThemeCategories>({})

  useEffect(() => {
    fetchThemes()
      .then((data) => setThemesMap(data))
      .catch(() => {})
  }, [])

  const doSearch = useCallback((opts: {
    dir: Direction; q: string; theme: string; categorie: string
    graphie: string; source: string; page: number; perPage: number
  }) => {
    setLoading(true)
    const params = {
      q: opts.q || undefined,
      theme: !opts.q && opts.theme ? opts.theme : undefined,
      categorie: !opts.q && opts.categorie ? opts.categorie : undefined,
      graphie: opts.graphie || undefined,
      source: opts.source || undefined,
      page: opts.page,
      per_page: opts.perPage,
    }
    const search = opts.dir === 'oc_to_fr' ? searchProvencal(params) : searchDictionary(params)
    search
      .then((data) => {
        setResults(data.items)
        setTotal(data.total)
        setSuggestions(data.suggestions ?? [])
      })
      .catch(() => { setResults([]); setTotal(0) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      doSearch({ dir: direction, q, theme, categorie, graphie, source, page, perPage })
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [direction, q, theme, categorie, graphie, source, page, perPage, doSearch])

  const handleQ = useCallback((v: string) => { setQ(v); setPage(1) }, [])
  const handleTheme = useCallback((v: string) => { setTheme(v); setCategorie(''); setPage(1) }, [])
  const handleCategorie = useCallback((v: string) => { setCategorie(v); setPage(1) }, [])
  const handleGraphie = useCallback((v: string) => { setGraphie(v); setPage(1) }, [])
  const handleSource = useCallback((v: string) => { setSource(v); setPage(1) }, [])
  const handlePerPage = useCallback((v: number) => { setPerPage(v); setPage(1) }, [])
  const handleDirection = useCallback((d: Direction) => {
    setDirection(d); setQ(''); setTheme(''); setCategorie(''); setGraphie(''); setSource(''); setPage(1)
  }, [])

  const refresh = useCallback(() => {
    doSearch({ dir: direction, q, theme, categorie, graphie, source, page, perPage })
  }, [doSearch, direction, q, theme, categorie, graphie, source, page, perPage])

  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const filtersDisabled = q.length > 0
  const categories = theme && themesMap[theme] ? themesMap[theme] : []

  return {
    direction, q, theme, categorie, graphie, source, page, perPage,
    results, total, totalPages, suggestions, loading,
    themesMap, categories, filtersDisabled, perPageOptions: PER_PAGE_OPTIONS,
    handleQ, handleTheme, handleCategorie, handleGraphie, handleSource, handlePerPage, handleDirection,
    setPage,
    refresh,
  }
}
