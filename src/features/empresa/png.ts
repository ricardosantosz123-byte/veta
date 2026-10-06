/** Tipos que react-pdf sí lee directo; los demás (SVG, WEBP) se convierten a PNG. */
export const TIPOS_PDF = ['image/png', 'image/jpeg']

/**
 * Convierte una imagen (SVG, WEBP…) en PNG con un canvas, sin pasar por el servidor.
 * El lado mayor queda en `maxLado` px; un SVG sin medidas se dibuja a ese tamaño.
 */
export async function convertirAPng(archivo: File, maxLado = 800): Promise<File> {
  const url = URL.createObjectURL(archivo)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    const ancho0 = img.naturalWidth || maxLado
    const alto0 = img.naturalHeight || maxLado
    const escala = Math.min(1, maxLado / Math.max(ancho0, alto0)) || 1
    // Un SVG pequeño se amplía para que se vea nítido en el PDF.
    const factor = archivo.type === 'image/svg+xml' ? maxLado / Math.max(ancho0, alto0) : escala
    const ancho = Math.max(1, Math.round(ancho0 * factor))
    const alto = Math.max(1, Math.round(alto0 * factor))

    const canvas = document.createElement('canvas')
    canvas.width = ancho
    canvas.height = alto
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No se pudo preparar la imagen.')
    ctx.drawImage(img, 0, 0, ancho, alto)
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'))
    if (!blob) throw new Error('No se pudo convertir el logo a PNG.')
    return new File([blob], archivo.name.replace(/\.[^.]+$/, '') + '.png', { type: 'image/png' })
  } finally {
    URL.revokeObjectURL(url)
  }
}
