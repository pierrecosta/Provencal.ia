import { apiFetch } from './api'
import { ApiError } from './types'
import type { LoginResponse } from './types'

export async function login(pseudo: string, password: string): Promise<LoginResponse> {
  const res = await apiFetch('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ pseudo, password }),
  })
  if (!res.ok) throw new ApiError(res.status, 'Identifiant ou mot de passe incorrect')
  return res.json() as Promise<LoginResponse>
}

export async function logout(): Promise<void> {
  await apiFetch('/api/v1/auth/logout', { method: 'POST' })
}
