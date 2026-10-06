import { supabase, type Enum } from '@/lib/supabase'

// Existencia, costo promedio, valor y alertas los calcula la base (migración de la Fase 6).
// Aquí solo se leen y se mandan los movimientos.

export const TIPOS_INSUMO = ['madera', 'tela', 'piel', 'espuma', 'herraje', 'acabado', 'empaque', 'otro'] as const
export type TipoInsumo = (typeof TIPOS_INSUMO)[number]

export const nombreTipo: Record<TipoInsumo, string> = {
  madera: 'Madera',
  tela: 'Tela',
  piel: 'Piel',
  espuma: 'Espuma',
  herraje: 'Herraje',
  acabado: 'Acabado',
  empaque: 'Empaque',
  otro: 'Otro',
}

export const UNIDADES = ['pza', 'm', 'm2', 'dm2', 'pie_tabla', 'kg', 'l'] as const
export type Unidad = (typeof UNIDADES)[number]

export const nombreUnidad: Record<Unidad, string> = {
  pza: 'pza',
  m: 'm',
  m2: 'm²',
  dm2: 'dm²',
  pie_tabla: 'pie tabla',
  kg: 'kg',
  l: 'l',
}

/** Para mostrar unidades que vienen de la base como texto. */
export function unidad(u: string | null | undefined): string {
  return u ? (nombreUnidad[u as Unidad] ?? u) : ''
}

/** Unidad sugerida al elegir el tipo en un alta (la piel se compra por dm²). */
export const unidadSugerida: Partial<Record<TipoInsumo, Unidad>> = { piel: 'dm2' }

export type TipoMovimiento = Enum<'tipo_movimiento'>

export const nombreMovimiento: Record<TipoMovimiento, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste',
}

// ───────────── Insumos ─────────────

export async function leerInsumos(empresaId: string) {
  const { data, error } = await supabase.from('v_insumos').select('*').eq('empresa_id', empresaId).order('nombre')
  if (error) throw error
  return data
}
export type Insumo = Awaited<ReturnType<typeof leerInsumos>>[number]

export async function leerInsumo(id: string) {
  const { data, error } = await supabase.from('v_insumos').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export interface InsumoEditable {
  nombre: string
  tipo: TipoInsumo
  unidad: Unidad
  minimo: number
  proveedor: string | null
}

/** Alta con existencia inicial opcional: la base la registra como primera entrada y exige su costo. */
export async function crearInsumo(empresaId: string, i: InsumoEditable & { existencia_inicial: number; costo_inicial: number | null }) {
  const { data, error } = await supabase.rpc('crear_insumo', {
    p_empresa: empresaId,
    p_nombre: i.nombre,
    p_tipo: i.tipo,
    p_unidad: i.unidad,
    p_minimo: i.minimo,
    ...(i.proveedor ? { p_proveedor: i.proveedor } : {}),
    p_existencia_inicial: i.existencia_inicial,
    ...(i.costo_inicial !== null ? { p_costo_inicial: i.costo_inicial } : {}),
  })
  if (error) throw error
  return data
}

export async function actualizarInsumo(id: string, cambios: Partial<InsumoEditable> & { activo?: boolean }) {
  const { error } = await supabase.from('insumos').update(cambios).eq('id', id)
  if (error) throw error
}

export async function borrarInsumo(id: string) {
  const { error } = await supabase.from('insumos').delete().eq('id', id)
  if (error) throw error
}

// ───────────── Movimientos ─────────────

export async function leerMovimientos(insumoId: string) {
  const { data, error } = await supabase
    .from('v_movimientos_insumo')
    .select('*')
    .eq('insumo_id', insumoId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return data
}
export type Movimiento = Awaited<ReturnType<typeof leerMovimientos>>[number]

export interface MovimientoNuevo {
  insumo_id: string
  tipo: 'entrada' | 'salida'
  cantidad: number
  costo_unitario?: number
  orden_id?: string | null
  nota?: string | null
}

export async function registrarMovimiento(empresaId: string, m: MovimientoNuevo) {
  const { error } = await supabase.from('movimientos_insumo').insert({ empresa_id: empresaId, ...m })
  if (error) throw error
}

/** Ajuste por conteo físico: la base calcula la diferencia contra la existencia registrada. */
export async function ajustarExistencia(insumoId: string, contada: number, motivo: string) {
  const { data, error } = await supabase.rpc('ajustar_existencia', { p_insumo: insumoId, p_existencia_contada: contada, p_motivo: motivo })
  if (error) throw error
  return data
}

/** Material entregado en una o varias órdenes. Al Destajista la base le quita el valor. */
export async function leerMaterialEntregado(ordenIds: string[]) {
  if (ordenIds.length === 0) return []
  const { data, error } = await supabase.rpc('material_entregado', { p_ordenes: ordenIds })
  if (error) throw error
  return data
}
export type MaterialEntregado = Awaited<ReturnType<typeof leerMaterialEntregado>>[number]
