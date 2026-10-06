import { empresaParaPdf } from '@/features/cotizaciones/pdf/preparar'
import type { Orden } from '@/features/produccion/api'

/** PDF de la orden. Montos tal cual los guarda la base. */
export async function prepararPdfOrden(empresaId: string, o: Orden): Promise<Blob> {
  const [{ generarPdfOrden }, { empresa, logo }] = await Promise.all([import('@/features/produccion/pdf/generar-orden'), empresaParaPdf(empresaId)])
  return generarPdfOrden({
    empresa: { nombre: empresa.nombre, color_marca: empresa.color_marca, telefono: empresa.telefono },
    logo,
    orden: {
      folio: o.folio!,
      etapa: o.etapa?.nombre ?? 'Orden de producción',
      descripcion: o.descripcion,
      cantidad: o.cantidad,
      fecha_compromiso: o.fecha_compromiso,
      costo_acordado: Number(o.costo_acordado),
      pagado: Number(o.pagado),
      notas: o.notas,
      pedido_folio: o.renglon?.pedido?.folio ?? null,
    },
    destajista: o.destajista?.nombre ?? null,
  })
}
