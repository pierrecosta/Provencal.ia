import { apiFetch } from './api'
import { ApiError } from './types'

export async function uploadImageFile(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await apiFetch('/api/v1/upload/image', { method: 'POST', body: formData })
  if (!res.ok) throw new ApiError(res.status, "Erreur lors de l'upload de l'image")
  const data = await res.json() as { image_ref: string }
  return data.image_ref
}
