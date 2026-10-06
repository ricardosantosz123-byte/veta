import type { Cotizacion, Renglon } from '@/features/cotizaciones/api'
import { leerEmpresa, urlPublica } from '@/features/empresa/api'
import { nombreCompleto } from '@/features/clientes/api'

/** Logo para el PDF: la copia PNG si existe; si no, el original cuando ya es PNG o JPG. */
function rutaLogoPdf(e: { logo_pdf_path: string | null; logo_path: string | null }) {
  if (e.logo_pdf_path) return e.logo_pdf_path
  return e.logo_path && /\.(png|jpe?g)$/i.test(e.logo_path) ? e.logo_path : null
}

/** Datos de la empresa y su logo (data: URL) para cualquier PDF: cotización, recibo… */
export async function empresaParaPdf(empresaId: string) {
  const [{ imagenComoDataUrl }, empresa] = await Promise.all([import('@/features/cotizaciones/pdf/generar'), leerEmpresa(empresaId)])
  const logo = await imagenComoDataUrl(urlPublica(rutaLogoPdf(empresa)))
  return {
    logo,
    empresa: {
      nombre: empresa.nombre,
      razon_social: empresa.razon_social,
      rfc: empresa.rfc,
      telefono: empresa.telefono,
      email: empresa.email,
      direccion: empresa.direccion,
      color_marca: empresa.color_marca,
      iva: Number(empresa.iva),
      condiciones_cotizacion: empresa.condiciones_cotizacion,
    },
  }
}

/** Arma los datos y genera el PDF. @react-pdf/renderer se descarga aquí, solo cuando hace falta. */
export async function prepararPdfCotizacion(cotizacion: Cotizacion, renglones: Renglon[]): Promise<Blob> {
  const [{ generarPdfCotizacion }, { empresa, logo }] = await Promise.all([
    import('@/features/cotizaciones/pdf/generar'),
    empresaParaPdf(cotizacion.empresa_id!),
  ])
  const cl = cotizacion.cliente

  return generarPdfCotizacion({
    empresa,
    logo,
    cotizacion: {
      folio: cotizacion.folio!,
      fecha: cotizacion.fecha!,
      vigencia_hasta: cotizacion.vigencia_hasta,
      subtotal: Number(cotizacion.subtotal),
      descuento_pct: Number(cotizacion.descuento_pct),
      descuento_monto: Number(cotizacion.descuento_monto),
      envio: Number(cotizacion.envio),
      iva: Number(cotizacion.iva),
      total: Number(cotizacion.total),
      precios_con_iva: !!cotizacion.precios_con_iva,
      notas: cotizacion.notas,
    },
    cliente: {
      nombre: cl ? nombreCompleto(cl) : '',
      empresa: cl?.empresa_cliente ?? null,
      telefono: cl?.telefono ?? null,
      email: cl?.email ?? null,
      direccion: cl?.direccion ?? null,
    },
    renglones: renglones.map((r) => ({
      descripcion: r.descripcion,
      opciones: r.opciones_texto,
      cantidad: r.cantidad,
      precio: Number(r.precio_unitario ?? 0),
      importe: Number(r.importe ?? 0),
    })),
  })
}

export function nombreArchivo(folio: number, cliente: string, prefijo = 'Cotizacion-C') {
  const limpio = cliente.normalize('NFD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-')
  return `${prefijo}-${folio}${limpio ? `-${limpio}` : ''}.pdf`
}

export function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
