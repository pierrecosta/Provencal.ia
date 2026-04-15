import { apiFetch } from './api'
import { ApiError } from './types'
import type { LibraryEntry, LibraryEntryDetail, LibraryBody, LibraryParams, PaginatedResponse } from './types'

export async function fetchLibraryEntries(params: LibraryParams): Promise<PaginatedResponse<LibraryEntry>> {
  const p = new URLSearchParams()
  if (params.page !== undefined) p.set('page', String(params.page))
  if (params.per_page !== undefined) p.set('per_page', String(params.per_page))
  if (params.type) p.set('type', params.type)
  if (params.periode) p.set('periode', params.periode)
  if (params.lieu) p.set('lieu', params.lieu)
  const res = await apiFetch(`/api/v1/library?${p}`)
  if (!res.ok) throw new ApiError(res.status, 'Erreur chargement bibliothèque')
  return res.json() as Promise<PaginatedResponse<LibraryEntry>>
}

export async function fetchLibraryEntry(id: number | string): Promise<LibraryEntryDetail> {
  const res = await apiFetch(`/api/v1/library/${id}`)
  if (!res.ok) throw new ApiError(res.status, 'Entrée introuvable')
  return res.json() as Promise<LibraryEntryDetail>
}

export async function fetchLibraryPeriodes(): Promise<string[]> {
  const res = await apiFetch('/api/v1/library/periodes')
  if (!res.ok) throw new ApiError(res.status, 'Erreur chargement périodes')
  return res.json() as Promise<string[]>
}

export async function createLibraryEntry(data: LibraryBody): Promise<LibraryEntry> {
  const res = await apiFetch('/api/v1/library', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new ApiError(res.status, 'Erreur création entrée')
  return res.json() as Promise<LibraryEntry>
}

export async function updateLibraryEntry(id: number, data: LibraryBody): Promise<LibraryEntry> {
  const res = await apiFetch(`/api/v1/library/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  if (!res.ok) throw new ApiError(res.status, 'Erreur modification entrée')
  return res.json() as Promise<LibraryEntry>
}

export async function deleteLibraryEntry(id: number): Promise<void> {
  const res = await apiFetch(`/api/v1/library/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new ApiError(res.status, 'Erreur suppression entrée')
}

export async function rollbackLibraryEntry(id: number): Promise<LibraryEntry> {
  const res = await apiFetch(`/api/v1/library/${id}/rollback`, { method: 'POST' })
  if (!res.ok) throw new ApiError(res.status, 'Erreur rollback entrée')
  return res.json() as Promise<LibraryEntry>
}
