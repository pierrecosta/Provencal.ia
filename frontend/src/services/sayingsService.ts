import { apiFetch } from './api'
import { ApiError } from './types'
import type { Saying, SayingCreate, SayingUpdate, SayingsParams, PaginatedResponse } from './types'

export async function fetchTodaySaying(): Promise<Saying> {
  const res = await apiFetch('/api/v1/sayings/today')
  if (!res.ok) throw new ApiError(res.status, 'Erreur chargement terme du jour')
  return res.json() as Promise<Saying>
}

export async function fetchSayings(params: SayingsParams): Promise<PaginatedResponse<Saying>> {
  const p = new URLSearchParams()
  if (params.page !== undefined) p.set('page', String(params.page))
  if (params.per_page !== undefined) p.set('per_page', String(params.per_page))
  if (params.type) p.set('type', params.type)
  if (params.localite) p.set('localite', params.localite)
  const res = await apiFetch(`/api/v1/sayings?${p}`)
  if (!res.ok) throw new ApiError(res.status, 'Erreur chargement proverbes')
  return res.json() as Promise<PaginatedResponse<Saying>>
}

export async function createSaying(data: SayingCreate): Promise<Saying> {
  const res = await apiFetch('/api/v1/sayings', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new ApiError(res.status, 'Erreur création')
  return res.json() as Promise<Saying>
}

export async function updateSaying(id: number, data: SayingUpdate): Promise<Saying> {
  const res = await apiFetch(`/api/v1/sayings/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  if (!res.ok) throw new ApiError(res.status, 'Erreur modification')
  return res.json() as Promise<Saying>
}

export async function deleteSaying(id: number): Promise<void> {
  const res = await apiFetch(`/api/v1/sayings/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new ApiError(res.status, 'Erreur suppression')
}

export async function rollbackSaying(id: number): Promise<Saying> {
  const res = await apiFetch(`/api/v1/sayings/${id}/rollback`, { method: 'POST' })
  if (!res.ok) throw new ApiError(res.status, 'Erreur rollback')
  return res.json() as Promise<Saying>
}
