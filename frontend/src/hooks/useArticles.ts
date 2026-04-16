import { useCallback, useEffect, useState } from 'react'
import {
  fetchArticles as apiFetchArticles,
  createArticle as apiCreate,
  updateArticle as apiUpdate,
  deleteArticle as apiDelete,
  rollbackArticle as apiRollback,
} from '../services/articlesService'
import type { Article, ArticleBody } from '../services/types'

export interface UseArticlesReturn {
  articles: Article[]
  total: number
  page: number
  pages: number
  loading: boolean
  filterCategorie: string
  filterAnnee: string
  filterMois: string
  setFilterCategorie: (v: string) => void
  setFilterAnnee: (v: string) => void
  setFilterMois: (v: string) => void
  loadArticles: (p: number) => Promise<void>
  createArticle: (data: ArticleBody) => Promise<Article>
  updateArticle: (id: number, data: ArticleBody) => Promise<Article>
  deleteArticle: (id: number) => Promise<void>
  rollbackArticle: (id: number) => Promise<Article>
  replaceArticle: (a: Article) => void
  removeArticle: (id: number) => void
}

export function useArticles(): UseArticlesReturn {
  const [articles, setArticles] = useState<Article[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(false)

  const [filterCategorie, setFilterCategorie] = useState('')
  const [filterAnnee, setFilterAnnee] = useState('')
  const [filterMois, setFilterMois] = useState('')

  const loadArticles = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const data = await apiFetchArticles({
        page: p,
        per_page: 20,
        categorie: filterCategorie || undefined,
        annee: filterAnnee || undefined,
        mois: filterMois || undefined,
      })
      setArticles(data.items)
      setTotal(data.total)
      setPages(data.pages)
      setPage(data.page)
    } catch {
      // Erreur réseau — liste inchangée
    } finally {
      setLoading(false)
    }
  }, [filterCategorie, filterAnnee, filterMois])

  useEffect(() => { void loadArticles(1) }, [loadArticles])

  const createArticle = useCallback((data: ArticleBody) => apiCreate(data), [])
  const updateArticle = useCallback((id: number, data: ArticleBody) => apiUpdate(id, data), [])
  const deleteArticle = useCallback((id: number) => apiDelete(id), [])
  const rollbackArticle = useCallback((id: number) => apiRollback(id), [])

  const replaceArticle = useCallback(
    (a: Article) => setArticles((prev) => prev.map((x) => (x.id === a.id ? a : x))),
    [],
  )
  const removeArticle = useCallback(
    (id: number) => setArticles((prev) => prev.filter((x) => x.id !== id)),
    [],
  )

  return {
    articles, total, page, pages, loading,
    filterCategorie, filterAnnee, filterMois,
    setFilterCategorie, setFilterAnnee, setFilterMois,
    loadArticles,
    createArticle, updateArticle, deleteArticle, rollbackArticle,
    replaceArticle, removeArticle,
  }
}
