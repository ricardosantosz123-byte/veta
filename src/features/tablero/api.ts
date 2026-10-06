import type { Enum } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

// Todos los montos los calcula la función tablero() en la base; aquí solo se tipan y se muestran.
export interface Tablero {
  completo: boolean
  mes: string
  ventas_mes: number
  pedidos_mes: number
  cobrado_mes: number
  por_cobrar: number
  anticipos_pendientes: number
  conversion: { cotizaciones: number; vendidas: number }
  serie: { mes: string; ventas: number; cobrado: number }[]
  por_estado: Partial<Record<Enum<'estado_pedido'>, number>>
  por_etapa: { etapa: string; pendientes: number; en_proceso: number }[]
  por_vencer: { id: string; folio: number; cliente: string; total: number; vigencia_hasta: string }[]
  margen_mes: { venta_sin_iva: number; costo: number; margen: number; pct: number | null } | null
  margen_pedidos: { id: string; folio: number; cliente: string; venta_sin_iva: number; costo_produccion: number; margen_bruto: number; margen_pct: number | null }[] | null
  destajistas: { por_pagar: number; comprometido: number } | null
  insumos_bajo_minimo: { id: string; nombre: string; existencia: number; minimo: number; unidad: string }[] | null
}

export async function leerTablero(empresaId: string): Promise<Tablero> {
  const { data, error } = await supabase.rpc('tablero', { p_empresa: empresaId })
  if (error) throw error
  return data as unknown as Tablero
}
