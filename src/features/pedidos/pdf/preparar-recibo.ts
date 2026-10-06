import { empresaParaPdf } from '@/features/cotizaciones/pdf/preparar'
import { nombreMetodo, type Pago, type Pedido } from '@/features/pedidos/api'

/** Recibo de un pago. Montos, acumulado y saldo vienen de la base (v_pagos); aquí solo se acomodan. */
export async function prepararPdfRecibo(pedido: Pedido, pago: Pago): Promise<Blob> {
  const [{ generarPdfRecibo }, { empresa, logo }] = await Promise.all([
    import('@/features/pedidos/pdf/generar-recibo'),
    empresaParaPdf(pedido.empresa_id!),
  ])
  return generarPdfRecibo({
    empresa,
    logo,
    pago: {
      folio: pago.folio!,
      fecha: pago.fecha!,
      monto: Number(pago.monto),
      metodo: nombreMetodo[pago.metodo!],
      referencia: pago.referencia,
      anulado: !!pago.anulado,
    },
    pedido: {
      folio: pedido.folio!,
      total: Number(pago.pedido_total),
      pagado_acumulado: Number(pago.pagado_acumulado ?? 0),
      saldo_despues: Number(pago.saldo_despues ?? pago.pedido_total),
    },
    cliente: {
      nombre: [pedido.cliente_nombre, pedido.cliente_apellidos].filter(Boolean).join(' '),
      empresa: pedido.empresa_cliente,
    },
  })
}
