import { pdf } from '@react-pdf/renderer'
import { DocumentoRecibo, type DatosRecibo } from '@/features/pedidos/pdf/documento-recibo'

/** Genera el recibo en el navegador. Este módulo se carga solo cuando se necesita. */
export async function generarPdfRecibo(datos: DatosRecibo): Promise<Blob> {
  return pdf(<DocumentoRecibo {...datos} />).toBlob()
}
