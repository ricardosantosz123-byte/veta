import { pdf } from '@react-pdf/renderer'
import { DocumentoCorte, type DatosCorte } from '@/features/produccion/pdf/documento-corte'

export async function generarPdfCorte(datos: DatosCorte): Promise<Blob> {
  return pdf(<DocumentoCorte {...datos} />).toBlob()
}
