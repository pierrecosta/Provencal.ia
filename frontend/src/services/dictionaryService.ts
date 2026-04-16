import { apiFetch } from './api'
import { ApiError } from './types'
import type {
  ThemeCategories,
  DictEntry,
  DictEntryDetail,
  DictEntryUpdate,
  DictSearchParams,
  ProvSearchParams,
  DictPage,
} from './types'

export async function fetchThemes(): Promise<ThemeCategories> {
  const res = await apiFetch('/api/v1/dictionary/themes')
  if (!res.ok) throw new ApiError(res.status, 'Erreur chargement thèmes')
  return res.json() as Promise<ThemeCategories>
}

export async function searchDictionary(params: DictSearchParams): Promise<DictPage> {
  const p = new URLSearchParams()
  if (params.q) p.set('q', params.q)
  if (!params.q && params.theme) p.set('theme', params.theme)
  if (!params.q && params.categorie) p.set('categorie', params.categorie)
  if (params.graphie) p.set('graphie', params.graphie)
  if (params.source) p.set('source', params.source)
  if (params.page !== undefined) p.set('page', String(params.page))
  if (params.per_page !== undefined) p.set('per_page', String(params.per_page))
  const res = await apiFetch(`/api/v1/dictionary?${p}`)
  if (!res.ok) throw new ApiError(res.status, 'Erreur recherche dictionnaire')
  return res.json() as Promise<DictPage>
}

export async function searchProvencal(params: ProvSearchParams): Promise<DictPage> {
  const p = new URLSearchParams()
  if (params.q) p.set('q', params.q)
  if (params.graphie) p.set('graphie', params.graphie)
  if (params.source) p.set('source', params.source)
  if (params.page !== undefined) p.set('page', String(params.page))
  if (params.per_page !== undefined) p.set('per_page', String(params.per_page))
  const res = await apiFetch(`/api/v1/dictionary/search?${p}`)
  if (!res.ok) throw new ApiError(res.status, 'Erreur recherche provençal')
  return res.json() as Promise<DictPage>
}

export async function importDictionary(file: File): Promise<{ imported: number; skipped: number }> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await apiFetch('/api/v1/dictionary/import', { method: 'POST', body: formData })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Erreur lors de l'import" })) as { detail: string }
    throw new ApiError(res.status, err.detail ?? "Erreur lors de l'import")
  }
  return res.json() as Promise<{ imported: number; skipped: number }>
}

export async function fetchEntryDetail(id: number): Promise<DictEntryDetail> {
  const res = await apiFetch(`/api/v1/dictionary/${id}`)
  if (!res.ok) throw new ApiError(res.status, 'Entrée introuvable')
  return res.json() as Promise<DictEntryDetail>
}

export async function updateEntry(id: number, data: DictEntryUpdate): Promise<DictEntryDetail> {
  const res = await apiFetch(`/api/v1/dictionary/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new ApiError(res.status, 'Erreur modification')
  return res.json() as Promise<DictEntryDetail>
}

export async function deleteEntry(id: number): Promise<void> {
  const res = await apiFetch(`/api/v1/dictionary/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new ApiError(res.status, 'Erreur suppression')
}

export async function lockEntry(id: number): Promise<void> {
  const res = await apiFetch(`/api/v1/dictionary/${id}/lock`, { method: 'POST' })
  if (!res.ok) throw new ApiError(res.status, 'Erreur verrouillage')
}

export async function unlockEntry(id: number): Promise<void> {
  const res = await apiFetch(`/api/v1/dictionary/${id}/lock`, { method: 'DELETE' })
  if (!res.ok) throw new ApiError(res.status, 'Erreur déverrouillage')
}

export async function rollbackEntry(id: number): Promise<void> {
  const res = await apiFetch(`/api/v1/dictionary/${id}/rollback`, { method: 'POST' })
  if (!res.ok) throw new ApiError(res.status, 'Erreur rollback')
}

// Re-export DictEntry pour usage dans les pages sans import supplémentaire
export type { DictEntry }
