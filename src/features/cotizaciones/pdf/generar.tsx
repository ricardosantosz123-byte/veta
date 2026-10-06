import { pdf } from '@react-pdf/renderer'
import { DocumentoCotizacion, type DatosPdf } from '@/features/cotizaciones/pdf/documento-cotizacion'

/** Descarga una imagen y la convierte en data: URL; si falla, el PDF sale con el nombre en texto. */
export async function imagenComoDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    const blob = await r.blob()
    if (!['image/png', 'image/jpeg'].includes(blob.type)) return null
    return await new Promise((ok, mal) => {
      const lector = new FileReader()
      lector.onload = () => ok(lector.result as string)
      lector.onerror = () => mal(lector.error)
      lector.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/** Genera el PDF de la cotización en el navegador. Este módulo se carga solo cuando se necesita. */
export async function generarPdfCotizacion(datos: DatosPdf): Promise<Blob> {
  return pdf(<DocumentoCotizacion {...datos} />).toBlob()
}
