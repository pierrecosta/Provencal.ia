import { apiFetch } from './api'
import { ApiError } from './types'
import type { AgendaEvent, EventBody, EventsParams, PaginatedResponse } from './types'

export async function fetchEvents(params: EventsParams): Promise<PaginatedResponse<AgendaEvent>> {
  const p = new URLSearchParams()
  if (params.page !== undefined) p.set('page', String(params.page))
  if (params.per_page !== undefined) p.set('per_page', String(params.per_page))
  if (params.archive) p.set('archive', 'true')
  if (params.lieu) p.set('lieu', params.lieu)
  if (params.annee) p.set('annee', params.annee)
  if (params.mois) p.set('mois', params.mois)
  const res = await apiFetch(`/api/v1/events?${p}`)
  if (!res.ok) throw new ApiError(res.status, 'Erreur chargement événements')
  return res.json() as Promise<PaginatedResponse<AgendaEvent>>
}

export async function fetchEvent(id: number | string): Promise<AgendaEvent> {
  const res = await apiFetch(`/api/v1/events/${id}`)
  if (!res.ok) throw new ApiError(res.status, 'Événement introuvable')
  return res.json() as Promise<AgendaEvent>
}

export async function createEvent(data: EventBody): Promise<AgendaEvent> {
  const res = await apiFetch('/api/v1/events', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new ApiError(res.status, 'Erreur création événement')
  return res.json() as Promise<AgendaEvent>
}

export async function updateEvent(id: number, data: EventBody): Promise<AgendaEvent> {
  const res = await apiFetch(`/api/v1/events/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  if (!res.ok) throw new ApiError(res.status, 'Erreur modification événement')
  return res.json() as Promise<AgendaEvent>
}

export async function deleteEvent(id: number): Promise<void> {
  const res = await apiFetch(`/api/v1/events/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new ApiError(res.status, 'Erreur suppression événement')
}

export async function rollbackEvent(id: number): Promise<AgendaEvent> {
  const res = await apiFetch(`/api/v1/events/${id}/rollback`, { method: 'POST' })
  if (!res.ok) throw new ApiError(res.status, 'Erreur rollback événement')
  return res.json() as Promise<AgendaEvent>
}
