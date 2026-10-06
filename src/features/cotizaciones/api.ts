import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase, type Tablas } from '@/lib/supabase'

const BUCKET_PRIVADO = 'privado'
const QUINCE_DIAS = 15 * 24 * 60 * 60

export async function leerCotizaciones(empresaId: string) {
  const { data, error } = await supabase
    .from('v_cotizaciones')
    .select('id, folio, fecha, vigencia_hasta, estado, estado_efectivo, total, precios_con_iva, cliente_id, cliente_nombre, cliente_apellidos, empresa_cliente, vendedor_id, renglones')
    .eq('empresa_id', empresaId)
    .order('folio', { ascending: false })
  if (error) throw error
  return data
}
export type CotizacionResumen = Awaited<ReturnType<typeof leerCotizaciones>>[number]

export async function leerCotizacion(id: string) {
  const { data, error } = await supabase
    .from('v_cotizaciones')
    .select('*, cliente:clientes(id, nombre, apellidos, empresa_cliente, telefono, email, direccion)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}
export type Cotizacion = NonNullable<Awaited<ReturnType<typeof leerCotizacion>>>

export async function leerRenglones(cotizacionId: string) {
  const { data, error } = await supabase
    .from('cotizacion_items')
    .select('id, modelo_id, opcion_ids, opciones_texto, descripcion, cantidad, precio_unitario, precio_manual, precio_sugerido, importe, vendido, pedido_id, orden')
    .eq('cotizacion_id', cotizacionId)
    .order('orden')
    .order('created_at')
  if (error) throw error
  return data
}
export type Renglon = Awaited<ReturnType<typeof leerRenglones>>[number]

export async function crearCotizacion(empresaId: string, clienteId: string, listaId: string | null) {
  const { data, error } = await supabase
    .from('cotizaciones')
    .insert({ empresa_id: empresaId, cliente_id: clienteId, lista_id: listaId })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export type CotizacionEditable = Pick<
  Tablas['cotizaciones']['Update'],
  'cliente_id' | 'lista_id' | 'fecha' | 'vigencia_hasta' | 'estado' | 'descuento_pct' | 'envio' | 'notas'
>
export async function actualizarCotizacion(id: string, cambios: CotizacionEditable) {
  const { error } = await supabase.from('cotizaciones').update(cambios).eq('id', id)
  if (error) throw error
}

export async function borrarCotizacion(id: string) {
  const { error } = await supabase.from('cotizaciones').delete().eq('id', id)
  if (error) throw error
}

export interface RenglonNuevo {
  modelo_id: string | null
  opcion_ids: string[]
  descripcion: string
  cantidad: number
  precio_manual: boolean
  /** Solo si es manual: el automático lo pone la base. */
  precio_unitario: number | null
}

export async function agregarRenglon(empresaId: string, cotizacionId: string, r: RenglonNuevo, orden: number) {
  const { error } = await supabase.from('cotizacion_items').insert({
    empresa_id: empresaId,
    cotizacion_id: cotizacionId,
    modelo_id: r.modelo_id,
    opcion_ids: r.opcion_ids,
    descripcion: r.descripcion,
    cantidad: r.cantidad,
    precio_manual: r.precio_manual,
    precio_unitario: r.precio_manual ? r.precio_unitario : null,
    orden,
  })
  if (error) throw error
}

export async function actualizarRenglon(id: string, r: Partial<RenglonNuevo>) {
  const cambios: Tablas['cotizacion_items']['Update'] = { ...r }
  // Al volver a automático, la base recalcula: se manda null para no sugerir ningún precio.
  if (r.precio_manual === false) cambios.precio_unitario = null
  const { error } = await supabase.from('cotizacion_items').update(cambios).eq('id', id)
  if (error) throw error
}

export async function borrarRenglon(id: string) {
  const { error } = await supabase.from('cotizacion_items').delete().eq('id', id)
  if (error) throw error
}

export async function recalcularPrecios(cotizacionId: string) {
  const { error } = await supabase.rpc('recalcular_precios_cotizacion', { p_cotizacion: cotizacionId })
  if (error) throw error
}

export async function duplicarCotizacion(cotizacionId: string) {
  const { data, error } = await supabase.rpc('duplicar_cotizacion', { p_cotizacion: cotizacionId })
  if (error) throw error
  return data
}

export async function crearPedido(cotizacionId: string, items: string[], incluirEnvio: boolean, fechaCompromiso: string | null) {
  const { data, error } = await supabase.rpc('crear_pedido_desde_cotizacion', {
    p_cotizacion: cotizacionId,
    p_items: items,
    p_incluir_envio: incluirEnvio,
    ...(fechaCompromiso ? { p_fecha_compromiso: fechaCompromiso } : {}),
  })
  if (error) throw error
  const { data: pedido } = await supabase.from('pedidos').select('folio').eq('id', data).single()
  return { id: data, folio: pedido?.folio ?? null }
}

export async function leerEquipo(empresaId: string) {
  const { data, error } = await supabase.rpc('nombres_equipo', { p_empresa: empresaId })
  if (error) throw error
  return data
}

/** Sube el PDF a privado/{empresa}/cotizaciones/{cotización}/ y devuelve la ruta. */
export async function subirPdf(empresaId: string, cotizacionId: string, folio: number, pdf: Blob) {
  const ruta = `${empresaId}/cotizaciones/${cotizacionId}/C-${folio}-${Date.now()}.pdf`
  const { error } = await supabase.storage.from(BUCKET_PRIVADO).upload(ruta, pdf, { contentType: 'application/pdf', upsert: false })
  if (error) throw error
  return ruta
}

/** URL firmada de 15 días para compartir el PDF por WhatsApp. */
export async function urlFirmada(ruta: string, nombreDescarga: string) {
  const { data, error } = await supabase.storage.from(BUCKET_PRIVADO).createSignedUrl(ruta, QUINCE_DIAS, { download: nombreDescarga })
  if (error) throw error
  return data.signedUrl
}

export interface ResultadoCorreo {
  correo: 'enviado' | 'no_configurado' | 'error'
}

/** Edge Function notificar (tipo cotizacion_enviada): manda el PDF adjunto al correo del cliente. */
export async function enviarPorCorreo(cotizacionId: string, pdfRuta: string): Promise<ResultadoCorreo> {
  const { data, error } = await supabase.functions.invoke<ResultadoCorreo>('notificar', {
    body: { tipo: 'cotizacion_enviada', cotizacion_id: cotizacionId, pdf_path: pdfRuta },
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
