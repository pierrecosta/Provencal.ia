/**
 * Compresse un fichier image côté client via Canvas API.
 * Retourne un fichier ≤ maxSizeMB en réduisant la qualité JPEG
 * puis la résolution si nécessaire.
 */
export async function compressImage(file: File, maxSizeMB = 2): Promise<File> {
  const maxBytes = maxSizeMB * 1024 * 1024

  // Si déjà sous la limite, retourner tel quel
  if (file.size <= maxBytes) return file

  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  let { width, height } = bitmap

  // Réduire les dimensions si très grande image (max 1920px)
  const MAX_DIM = 1920
  if (width > MAX_DIM || height > MAX_DIM) {
    const ratio = Math.min(MAX_DIM / width, MAX_DIM / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, width, height)

  // Réduire la qualité JPEG progressivement
  const outputType = 'image/jpeg'
  for (let quality = 0.85; quality >= 0.3; quality -= 0.1) {
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), outputType, quality),
    )
    if (blob.size <= maxBytes) {
      return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: outputType })
    }
  }

  // En dernier recours, diviser la résolution par 2
  canvas.width = Math.round(width / 2)
  canvas.height = Math.round(height / 2)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), outputType, 0.7),
  )
  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: outputType })
}
