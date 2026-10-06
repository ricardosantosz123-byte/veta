import { supabase, type Tablas } from '@/lib/supabase'

export async function leerClientes(empresaId: string) {
  const { data, error } = await supabase
    .from('v_clientes')
    .select('id, nombre, apellidos, empresa_cliente, telefono, email, cotizaciones, pedidos, saldo, created_at')
    .eq('empresa_id', empresaId)
    .order('nombre')
    .order('apellidos')
  if (error) throw error
  return data
}
export type ClienteResumen = Awaited<ReturnType<typeof leerClientes>>[number]

export async function leerCliente(id: string) {
  const { data, error } = await supabase.from('v_clientes').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}
export type Cliente = NonNullable<Awaited<ReturnType<typeof leerCliente>>>

export async function leerHistorial(clienteId: string) {
  const [cot, ped] = await Promise.all([
    supabase
      .from('v_cotizaciones')
      .select('id, folio, fecha, vigencia_hasta, estado_efectivo, total, precios_con_iva')
      .eq('cliente_id', clienteId)
      .order('fecha', { ascending: false })
      .order('folio', { ascending: false }),
    supabase
      .from('pedidos')
      .select('id, folio, created_at, estado, total, pagado, saldo')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false }),
  ])
  if (cot.error) throw cot.error
  if (ped.error) throw ped.error
  return { cotizaciones: cot.data, pedidos: ped.data }
}

export type ClienteEditable = Pick<
  Tablas['clientes']['Update'],
  'nombre' | 'apellidos' | 'empresa_cliente' | 'telefono' | 'email' | 'direccion' | 'notas'
>

export async function crearCliente(empresaId: string, c: ClienteEditable & { nombre: string }) {
  const { data, error } = await supabase
    .from('clientes')
    .insert({ empresa_id: empresaId, ...c })
    .select('id, nombre, apellidos, telefono, email')
    .single()
  if (error) throw error
  return data
}

export async function actualizarCliente(id: string, c: ClienteEditable) {
  const { error } = await supabase.from('clientes').update(c).eq('id', id)
  if (error) throw error
}

export function nombreCompleto(c: { nombre: string; apellidos: string | null }) {
  return [c.nombre, c.apellidos].filter(Boolean).join(' ')
}
