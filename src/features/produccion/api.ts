import { supabase, type Enum, type Tablas } from '@/lib/supabase'

export type EstadoOrden = Enum<'estado_orden'>

// ───────────── Órdenes ─────────────

const CAMPOS_ORDEN =
  'id, folio, estado, descripcion, cantidad, costo_acordado, pagado, saldo, fecha_compromiso, iniciada_at, terminada_at, notas, created_at, etapa_id, destajista_id, pedido_item_id, etapa:etapas(nombre, orden), destajista:destajistas(nombre, telefono), renglon:pedido_items(pedido:pedidos(id, folio, fecha_compromiso, estado))'

/** Órdenes no canceladas de la empresa. Al Destajista, RLS solo le devuelve las suyas (y sin pedido). */
export async function leerOrdenes(empresaId: string) {
  const { data, error } = await supabase
    .from('ordenes_produccion')
    .select(CAMPOS_ORDEN)
    .eq('empresa_id', empresaId)
    .neq('estado', 'cancelada')
    .order('fecha_compromiso', { ascending: true, nullsFirst: false })
    .order('folio')
  if (error) throw error
  return data
}
export type Orden = Awaited<ReturnType<typeof leerOrdenes>>[number]

export async function leerOrden(id: string) {
  const { data, error } = await supabase.from('ordenes_produccion').select(CAMPOS_ORDEN).eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function avanzarOrden(id: string, estado: EstadoOrden, nota?: string) {
  const { error } = await supabase.rpc('marcar_avance_orden', { p_orden: id, p_estado: estado, ...(nota?.trim() ? { p_nota: nota.trim() } : {}) })
  if (error) throw error
}

export async function actualizarOrden(
  id: string,
  cambios: Pick<Tablas['ordenes_produccion']['Update'], 'destajista_id' | 'costo_acordado' | 'fecha_compromiso' | 'notas' | 'cantidad'>,
) {
  const { error } = await supabase.from('ordenes_produccion').update(cambios).eq('id', id)
  if (error) throw error
}

export interface OrdenNueva {
  pedido_item_id: string
  etapa_id: string
  destajista_id: string | null
  cantidad: number
  costo_acordado: number
  fecha_compromiso: string | null
}

export async function crearOrdenes(empresaId: string, ordenes: OrdenNueva[]) {
  if (ordenes.length === 0) return
  const { error } = await supabase.from('ordenes_produccion').insert(ordenes.map((o) => ({ empresa_id: empresaId, ...o })))
  if (error) throw error
}

export async function sugerirOrdenes(pedidoId: string) {
  const { data, error } = await supabase.rpc('sugerir_ordenes', { p_pedido: pedidoId })
  if (error) throw error
  return data
}
export type Sugerencia = Awaited<ReturnType<typeof sugerirOrdenes>>[number]

/** Pedidos con anticipo pendiente o en producción y renglones sin órdenes (sin datos del cliente). */
export async function leerPorProgramar(empresaId: string) {
  const { data, error } = await supabase
    .from('pedidos')
    .select('id, folio, estado, fecha_compromiso, inicio_autorizado_at, created_at, pedido_items(id, descripcion, opciones_texto, cantidad, estado_produccion, ordenes_produccion(id, estado))')
    .eq('empresa_id', empresaId)
    .in('estado', ['anticipo_pendiente', 'en_produccion'])
    .order('fecha_compromiso', { ascending: true, nullsFirst: false })
    .order('folio')
  if (error) throw error
  return data
}

// ───────────── Pagos de destajo ─────────────

export async function leerPagosOrden(ordenId: string) {
  const { data, error } = await supabase
    .from('pagos_destajista')
    .select('id, fecha, monto, metodo, nota, created_at')
    .eq('orden_id', ordenId)
    .order('fecha')
  if (error) throw error
  return data
}

export async function pagarDestajo(empresaId: string, ordenId: string, p: { monto: number; metodo: Enum<'metodo_pago'>; fecha: string; nota: string | null }) {
  const { error } = await supabase.from('pagos_destajista').insert({ empresa_id: empresaId, orden_id: ordenId, ...p })
  if (error) throw error
}

/** Pagos del proveedor que ve la sesión (RLS: el Destajista solo ve los suyos). */
export async function leerMisPagos(empresaId: string) {
  const { data, error } = await supabase
    .from('pagos_destajista')
    .select('id, fecha, monto, metodo, nota, orden:ordenes_produccion(folio, descripcion)')
    .eq('empresa_id', empresaId)
    .order('fecha', { ascending: false })
    .limit(30)
  if (error) throw error
  return data
}

// ───────────── Destajistas y saldos ─────────────

export async function leerSaldosDestajo(empresaId: string) {
  const { data, error } = await supabase.from('v_destajo_saldos').select('*').eq('empresa_id', empresaId).order('nombre')
  if (error) throw error
  return data
}
export type SaldoDestajista = Awaited<ReturnType<typeof leerSaldosDestajo>>[number]

export async function leerCorte(empresaId: string, desde: string, hasta: string) {
  const { data, error } = await supabase.rpc('corte_destajistas', { p_empresa: empresaId, p_desde: desde, p_hasta: hasta })
  if (error) throw error
  return data
}
export type FilaCorte = Awaited<ReturnType<typeof leerCorte>>[number]

export async function leerDestajista(id: string) {
  const { data, error } = await supabase.from('destajistas').select('id, nombre, especialidad, tipo, telefono, email, notas, activo').eq('id', id).single()
  if (error) throw error
  return data
}

export type DestajistaEditable = Pick<Tablas['destajistas']['Update'], 'nombre' | 'especialidad' | 'tipo' | 'telefono' | 'email' | 'notas' | 'activo'>

export async function guardarDestajista(empresaId: string, id: string | null, d: DestajistaEditable & { nombre: string }) {
  const { error } = id
    ? await supabase.from('destajistas').update(d).eq('id', id)
    : await supabase.from('destajistas').insert({ empresa_id: empresaId, ...d })
  if (error) throw error
}

// ───────────── Pedido ─────────────

export async function autorizarInicio(pedidoId: string) {
  const { error } = await supabase.rpc('autorizar_inicio_sin_anticipo', { p_pedido: pedidoId })
  if (error) throw error
}
