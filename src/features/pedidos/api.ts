import { FunctionsHttpError } from '@supabase/supabase-js'
import { invocar } from '@/lib/funciones'
import { supabase, type Enum } from '@/lib/supabase'

const BUCKET_PRIVADO = 'privado'
const QUINCE_DIAS = 15 * 24 * 60 * 60

export async function leerPedidos(empresaId: string) {
  const { data, error } = await supabase
    .from('v_pedidos')
    .select('id, folio, created_at, estado, total, pagado, saldo, saldo_a_favor, fecha_compromiso, dias_para_compromiso, semaforo, cliente_id, cliente_nombre, cliente_apellidos, empresa_cliente, facturado')
    .eq('empresa_id', empresaId)
    .order('folio', { ascending: false })
  if (error) throw error
  return data
}
export type PedidoResumen = Awaited<ReturnType<typeof leerPedidos>>[number]

export async function leerPedido(id: string) {
  const { data, error } = await supabase.from('v_pedidos').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}
export type Pedido = NonNullable<Awaited<ReturnType<typeof leerPedido>>>

export async function leerRenglonesPedido(pedidoId: string) {
  const { data, error } = await supabase
    .from('pedido_items')
    .select('id, descripcion, opciones_texto, cantidad, precio_unitario, importe, estado_produccion')
    .eq('pedido_id', pedidoId)
    .order('created_at')
  if (error) throw error
  return data
}
export type RenglonPedido = Awaited<ReturnType<typeof leerRenglonesPedido>>[number]

export async function leerPagos(pedidoId: string) {
  const { data, error } = await supabase
    .from('v_pagos')
    .select('id, folio, fecha, monto, metodo, referencia, comprobante_path, anulado, anulado_at, motivo_anulacion, externo_id, created_at, pagado_acumulado, saldo_despues, pedido_folio, pedido_total')
    .eq('pedido_id', pedidoId)
    .order('created_at')
  if (error) throw error
  return data
}
export type Pago = Awaited<ReturnType<typeof leerPagos>>[number]

export const nombreMetodo: Record<Enum<'metodo_pago'>, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  mercado_pago: 'Mercado Pago',
  otro: 'Otro',
}

/** Sube un archivo a privado/{empresa}/{carpeta}/{pedido}/… y devuelve la ruta. */
export async function subirPrivado(empresaId: string, carpeta: 'pagos' | 'pedidos' | 'recibos', pedidoId: string, archivo: Blob, nombre: string) {
  const limpio = nombre.normalize('NFD').replace(/[^\w.-]/g, '_').slice(-60)
  const ruta = `${empresaId}/${carpeta}/${pedidoId}/${Date.now()}-${limpio}`
  const { error } = await supabase.storage.from(BUCKET_PRIVADO).upload(ruta, archivo, { contentType: archivo.type || undefined, upsert: false })
  if (error) throw error
  return ruta
}

export async function urlPrivada(ruta: string, segundos = 300, descarga?: string) {
  const { data, error } = await supabase.storage.from(BUCKET_PRIVADO).createSignedUrl(ruta, segundos, descarga ? { download: descarga } : undefined)
  if (error) throw error
  return data.signedUrl
}
export const urlPrivadaQuinceDias = (ruta: string, descarga: string) => urlPrivada(ruta, QUINCE_DIAS, descarga)

export interface PagoNuevo {
  monto: number
  metodo: Enum<'metodo_pago'>
  referencia: string | null
  fecha: string
  comprobante_path: string | null
}

export async function registrarPago(empresaId: string, pedidoId: string, p: PagoNuevo) {
  const { data, error } = await supabase
    .from('pagos_cliente')
    .insert({ empresa_id: empresaId, pedido_id: pedidoId, ...p })
    .select('id, folio')
    .single()
  if (error) throw error
  return data
}

export async function anularPago(id: string, motivo: string) {
  const { error } = await supabase.from('pagos_cliente').update({ anulado: true, motivo_anulacion: motivo }).eq('id', id)
  if (error) throw error
}

export async function actualizarPedido(
  id: string,
  cambios: { fecha_compromiso?: string | null; direccion_entrega?: string | null; notas?: string | null; facturado?: boolean; factura_path?: string | null },
) {
  const { error } = await supabase.from('pedidos').update(cambios).eq('id', id)
  if (error) throw error
}

export async function marcarEntregado(id: string) {
  const { error } = await supabase.from('pedidos').update({ estado: 'entregado' }).eq('id', id)
  if (error) throw error
}

export async function cancelarPedido(id: string, motivo: string) {
  const { error } = await supabase.from('pedidos').update({ estado: 'cancelado', motivo_cancelacion: motivo }).eq('id', id)
  if (error) throw error
}

export interface ResultadoCorreo {
  correo: 'enviado' | 'no_configurado' | 'error'
}

/** Edge Function notificar (tipo pago_recibido): recibo PDF adjunto al correo del cliente. */
export async function enviarReciboPorCorreo(pagoId: string, pdfRuta: string): Promise<ResultadoCorreo> {
  const { data, error } = await supabase.functions.invoke<ResultadoCorreo>('notificar', {
    body: { tipo: 'pago_recibido', pago_id: pagoId, pdf_path: pdfRuta },
  })
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const cuerpo = await error.context.json().catch(() => null)
      throw new Error(cuerpo?.error ?? 'No pudimos enviar el correo.')
    }
    throw new Error('No pudimos contactar al servidor. Revisa tu conexión.')
  }
  return data!
}

/** Estado de cuenta: pedidos y pagos de un cliente. Saldos y totales vienen de la base. */
export async function leerEstadoCuenta(clienteId: string) {
  const { data: pedidos, error } = await supabase
    .from('v_pedidos')
    .select('id, folio, created_at, estado, total, pagado, saldo, saldo_a_favor, fecha_compromiso')
    .eq('cliente_id', clienteId)
    .order('created_at')
  if (error) throw error
  const ids = pedidos.map((p) => p.id!).filter(Boolean)
  const { data: pagos, error: e2 } = ids.length
    ? await supabase
        .from('v_pagos')
        .select('id, folio, fecha, monto, metodo, referencia, anulado, pedido_id, pedido_folio')
        .in('pedido_id', ids)
        .order('fecha')
        .order('created_at')
    : { data: [], error: null }
  if (e2) throw e2
  return { pedidos, pagos }
}

// ───────────── Link de pago (Mercado Pago) ─────────────

export async function leerLinksPago(pedidoId: string) {
  const { data, error } = await supabase
    .from('links_pago')
    .select('id, monto, url, estado, concepto, created_at, pagado_at')
    .eq('pedido_id', pedidoId)
    .order('created_at', { ascending: false })
    .limit(10)
  if (error) throw error
  return data
}
export type LinkPago = Awaited<ReturnType<typeof leerLinksPago>>[number]

/** Edge Function mp-crear-link: la base valida rol, conexión y que el monto no supere el saldo. */
export function crearLinkPago(pedidoId: string, monto: number) {
  return invocar<{ url: string; monto: number; concepto: string }>('mp-crear-link', { pedido_id: pedidoId, monto }, 'No pudimos generar el link de pago.')
}

export async function cancelarLinkPago(id: string) {
  const { error } = await supabase.from('links_pago').update({ estado: 'cancelado' }).eq('id', id)
  if (error) throw error
}

export async function leerConexionMp(empresaId: string) {
  const { data, error } = await supabase.from('empresas').select('mp_conectado, mp_cuenta').eq('id', empresaId).single()
  if (error) throw error
  return data
}
