import { pdf } from '@react-pdf/renderer'
import { DocumentoOrden, type DatosOrden } from '@/features/produccion/pdf/documento-orden'

export async function generarPdfOrden(datos: DatosOrden): Promise<Blob> {
  return pdf(<DocumentoOrden {...datos} />).toBlob()
}
