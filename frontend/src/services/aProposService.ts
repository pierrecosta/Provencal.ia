import { apiFetch } from './api'
import { ApiError } from './types'
import type { AProposOut, AProposBlocOut } from './types'

export async function fetchAPropos(): Promise<AProposOut> {
  const res = await apiFetch('/api/v1/a-propos')
  if (!res.ok) throw new ApiError(res.status, 'Erreur chargement À propos')
  return res.json() as Promise<AProposOut>
}

export async function updateBloc(bloc: string, contenu: string): Promise<AProposBlocOut> {
  const res = await apiFetch(`/api/v1/a-propos/${bloc}`, {
    method: 'PUT',
    body: JSON.stringify({ contenu }),
  })
  if (!res.ok) throw new ApiError(res.status, 'Erreur modification')
  return res.json() as Promise<AProposBlocOut>
}

export async function lockBloc(bloc: string): Promise<void> {
  const res = await apiFetch(`/api/v1/a-propos/${bloc}/lock`, { method: 'POST' })
  if (!res.ok) throw new ApiError(res.status, 'Erreur verrouillage')
}

export async function unlockBloc(bloc: string): Promise<void> {
  const res = await apiFetch(`/api/v1/a-propos/${bloc}/lock`, { method: 'DELETE' })
  if (!res.ok) throw new ApiError(res.status, 'Erreur déverrouillage')
}

export async function rollbackBloc(bloc: string): Promise<void> {
  const res = await apiFetch(`/api/v1/a-propos/${bloc}/rollback`, { method: 'POST' })
  if (!res.ok) throw new ApiError(res.status, 'Erreur rollback')
}
