import { apiFetch } from './api'
import { ApiError } from './types'
import type { Article, ArticleBody, ArticlesParams, PaginatedResponse } from './types'

export async function fetchArticles(params: ArticlesParams): Promise<PaginatedResponse<Article>> {
  const p = new URLSearchParams()
  if (params.page !== undefined) p.set('page', String(params.page))
  if (params.per_page !== undefined) p.set('per_page', String(params.per_page))
  if (params.categorie) p.set('categorie', params.categorie)
  if (params.annee) p.set('annee', params.annee)
  if (params.mois) p.set('mois', params.mois)
  const res = await apiFetch(`/api/v1/articles?${p}`)
  if (!res.ok) throw new ApiError(res.status, 'Erreur chargement articles')
  return res.json() as Promise<PaginatedResponse<Article>>
}

export async function fetchArticle(id: number | string): Promise<Article> {
  const res = await apiFetch(`/api/v1/articles/${id}`)
  if (!res.ok) throw new ApiError(res.status, 'Article introuvable')
  return res.json() as Promise<Article>
}

export async function createArticle(data: ArticleBody): Promise<Article> {
  const res = await apiFetch('/api/v1/articles', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new ApiError(res.status, 'Erreur création article')
  return res.json() as Promise<Article>
}

export async function updateArticle(id: number, data: ArticleBody): Promise<Article> {
  const res = await apiFetch(`/api/v1/articles/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  if (!res.ok) throw new ApiError(res.status, 'Erreur modification article')
  return res.json() as Promise<Article>
}

export async function deleteArticle(id: number): Promise<void> {
  const res = await apiFetch(`/api/v1/articles/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new ApiError(res.status, 'Erreur suppression article')
}

export async function rollbackArticle(id: number): Promise<Article> {
  const res = await apiFetch(`/api/v1/articles/${id}/rollback`, { method: 'POST' })
  if (!res.ok) throw new ApiError(res.status, 'Erreur rollback article')
  return res.json() as Promise<Article>
}
