import { apiFetch } from './api'
import { ApiError } from './types'
import type { TranslateResult } from './types'

export async function translate(text: string): Promise<TranslateResult> {
  const res = await apiFetch('/api/v1/translate', {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new ApiError(res.status, 'Erreur traduction')
  return res.json() as Promise<TranslateResult>
}
