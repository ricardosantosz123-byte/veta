import { BUCKET_PUBLICO } from '@/features/empresa/api'
import { supabase, type Tablas } from '@/lib/supabase'

// ───────────── Lecturas ─────────────

export async function leerCategorias(empresaId: string) {
  const { data, error } = await supabase.from('categorias').select('id, nombre, orden').eq('empresa_id', empresaId).order('orden').order('nombre')
  if (error) throw error
  return data
}
export type Categoria = Awaited<ReturnType<typeof leerCategorias>>[number]

export async function leerEtapas(empresaId: string) {
  const { data, error } = await supabase.from('etapas').select('id, nombre, orden, activo').eq('empresa_id', empresaId).order('orden').order('nombre')
  if (error) throw error
  return data
}
export type Etapa = Awaited<ReturnType<typeof leerEtapas>>[number]

export async function leerGrupos(empresaId: string) {
  const { data, error } = await supabase
    .from('grupos_opcion')
    .select('id, nombre, obligatorio, orden, opciones(id, nombre, ajuste_precio, activo, orden)')
    .eq('empresa_id', empresaId)
    .order('orden')
    .order('nombre')
    .order('orden', { referencedTable: 'opciones' })
    .order('nombre', { referencedTable: 'opciones' })
  if (error) throw error
  return data
}
export type Grupo = Awaited<ReturnType<typeof leerGrupos>>[number]
export type Opcion = Grupo['opciones'][number]

export async function leerModelos(empresaId: string) {
  const { data, error } = await supabase
    .from('modelos')
    .select('id, nombre, descripcion, foto_path, categoria_id, sobre_diseno, activo, precio_base, created_at')
    .eq('empresa_id', empresaId)
    .order('nombre')
  if (error) throw error
  return data
}
export type ModeloResumen = Awaited<ReturnType<typeof leerModelos>>[number]

export async function leerModelo(id: string) {
  const { data, error } = await supabase
    .from('modelos')
    .select('*, modelo_grupos(grupo_id)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}
export type Modelo = NonNullable<Awaited<ReturnType<typeof leerModelo>>>

/** Costos por etapa del modelo. RLS: solo Admin, Producción y Contador ven filas. */
export async function leerCostos(modeloId: string) {
  const { data, error } = await supabase.from('costos_modelo').select('id, etapa_id, opcion_id, costo').eq('modelo_id', modeloId)
  if (error) throw error
  return data
}
export type Costo = Awaited<ReturnType<typeof leerCostos>>[number]

/** Markup del modelo. RLS: solo Admin y Contador. null = sin capturar (la base usa 1.0). */
export async function leerMarkup(modeloId: string) {
  const { data, error } = await supabase.from('modelo_costeo').select('markup').eq('modelo_id', modeloId).maybeSingle()
  if (error) throw error
  return data?.markup ?? null
}

export async function leerListas(empresaId: string) {
  const { data, error } = await supabase
    .from('listas_precios')
    .select('id, nombre, factor, incluye_iva, redondeo, predeterminada, activo')
    .eq('empresa_id', empresaId)
    .order('predeterminada', { ascending: false })
    .order('nombre')
  if (error) throw error
  return data
}
export type Lista = Awaited<ReturnType<typeof leerListas>>[number]

// ───────────── Precio y costo (siempre los calcula la base) ─────────────

export async function calcularPrecio(modeloId: string, opciones: string[], listaId: string | null) {
  const { data, error } = await supabase.rpc('calcular_precio', {
    p_modelo: modeloId,
    p_opciones: opciones,
    ...(listaId ? { p_lista: listaId } : {}),
  })
  if (error) throw error
  return data
}

export async function costearModelo(modeloId: string, opciones: string[], listaId: string | null) {
  const { data, error } = await supabase
    .rpc('costear_modelo', { p_modelo: modeloId, p_opciones: opciones, ...(listaId ? { p_lista: listaId } : {}) })
    .single()
  if (error) throw error
  return data as { costo: number; precio: number | null }
}

// ───────────── Escrituras (RLS: solo Admin y con la cuenta activa) ─────────────

type TablaOrdenable = 'etapas' | 'categorias' | 'grupos_opcion' | 'opciones'

export async function reordenar(tabla: TablaOrdenable, ids: string[]) {
  const { error } = await supabase.rpc('reordenar_catalogo', { p_tabla: tabla, p_ids: ids })
  if (error) throw error
}

export async function crearCategoria(empresaId: string, nombre: string, orden: number) {
  const { data, error } = await supabase.from('categorias').insert({ empresa_id: empresaId, nombre, orden }).select('id').single()
  if (error) throw error
  return data.id
}
export async function renombrarCategoria(id: string, nombre: string) {
  const { error } = await supabase.from('categorias').update({ nombre }).eq('id', id)
  if (error) throw error
}
export async function borrarCategoria(id: string) {
  const { error } = await supabase.from('categorias').delete().eq('id', id)
  if (error) throw error
}

export async function crearEtapa(empresaId: string, nombre: string, orden: number) {
  const { error } = await supabase.from('etapas').insert({ empresa_id: empresaId, nombre, orden })
  if (error) throw error
}
export async function actualizarEtapa(id: string, cambios: Pick<Tablas['etapas']['Update'], 'nombre' | 'activo'>) {
  const { error } = await supabase.from('etapas').update(cambios).eq('id', id)
  if (error) throw error
}

export async function crearGrupo(empresaId: string, nombre: string, obligatorio: boolean, orden: number) {
  const { data, error } = await supabase
    .from('grupos_opcion')
    .insert({ empresa_id: empresaId, nombre, obligatorio, orden })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}
export async function actualizarGrupo(id: string, cambios: Pick<Tablas['grupos_opcion']['Update'], 'nombre' | 'obligatorio'>) {
  const { error } = await supabase.from('grupos_opcion').update(cambios).eq('id', id)
  if (error) throw error
}
export async function borrarGrupo(id: string) {
  const { error } = await supabase.from('grupos_opcion').delete().eq('id', id)
  if (error) throw error
}

export async function crearOpciones(empresaId: string, grupoId: string, nombres: string[], ordenInicial: number) {
  if (nombres.length === 0) return
  const { error } = await supabase
    .from('opciones')
    .insert(nombres.map((nombre, i) => ({ empresa_id: empresaId, grupo_id: grupoId, nombre, orden: ordenInicial + i })))
  if (error) throw error
}
export async function actualizarOpcion(id: string, cambios: Pick<Tablas['opciones']['Update'], 'nombre' | 'ajuste_precio' | 'activo'>) {
  const { error } = await supabase.from('opciones').update(cambios).eq('id', id)
  if (error) throw error
}
export async function borrarOpcion(id: string) {
  const { error } = await supabase.from('opciones').delete().eq('id', id)
  if (error) throw error
}

export type ModeloEditable = Pick<
  Tablas['modelos']['Update'],
  'nombre' | 'descripcion' | 'categoria_id' | 'foto_path' | 'precio_base' | 'sobre_diseno' | 'activo'
>

export async function crearModelo(empresaId: string, m: ModeloEditable & { nombre: string }) {
  const { data, error } = await supabase.from('modelos').insert({ empresa_id: empresaId, ...m }).select('id').single()
  if (error) throw error
  return data.id
}
export async function actualizarModelo(id: string, cambios: ModeloEditable) {
  const { error } = await supabase.from('modelos').update(cambios).eq('id', id)
  if (error) throw error
}
export async function borrarModelo(id: string) {
  const { error } = await supabase.from('modelos').delete().eq('id', id)
  if (error) throw error
}

/** Deja exactamente estos grupos aplicables al modelo. */
export async function guardarGruposModelo(empresaId: string, modeloId: string, actuales: string[], nuevos: string[]) {
  const quitar = actuales.filter((g) => !nuevos.includes(g))
  const agregar = nuevos.filter((g) => !actuales.includes(g))
  if (quitar.length) {
    const { error } = await supabase.from('modelo_grupos').delete().eq('modelo_id', modeloId).in('grupo_id', quitar)
    if (error) throw error
  }
  if (agregar.length) {
    const { error } = await supabase
      .from('modelo_grupos')
      .insert(agregar.map((grupo_id) => ({ modelo_id: modeloId, grupo_id, empresa_id: empresaId })))
    if (error) throw error
  }
}

/**
 * Guarda un costo (base de etapa si opcionId es null, o ajuste de opción). Vacío o 0 en un ajuste lo borra.
 * La tabla tiene un índice único por (modelo, etapa, opción) sobre una expresión, así que no se usa upsert.
 */
export async function guardarCosto(
  empresaId: string,
  modeloId: string,
  existente: Costo | undefined,
  etapaId: string,
  opcionId: string | null,
  costo: number | null,
) {
  const borrar = costo === null || (opcionId !== null && costo === 0)
  if (existente && borrar) {
    const { error } = await supabase.from('costos_modelo').delete().eq('id', existente.id)
    if (error) throw error
  } else if (existente) {
    const { error } = await supabase.from('costos_modelo').update({ costo: costo! }).eq('id', existente.id)
    if (error) throw error
  } else if (!borrar) {
    const { error } = await supabase
      .from('costos_modelo')
      .insert({ empresa_id: empresaId, modelo_id: modeloId, etapa_id: etapaId, opcion_id: opcionId, costo: costo! })
    if (error) throw error
  }
}

export async function guardarMarkup(empresaId: string, modeloId: string, markup: number) {
  const { error } = await supabase
    .from('modelo_costeo')
    .upsert({ modelo_id: modeloId, empresa_id: empresaId, markup }, { onConflict: 'modelo_id' })
  if (error) throw error
}

export type ListaEditable = Pick<
  Tablas['listas_precios']['Update'],
  'nombre' | 'factor' | 'incluye_iva' | 'redondeo' | 'predeterminada' | 'activo'
>
export async function crearLista(empresaId: string, l: ListaEditable & { nombre: string }) {
  const { error } = await supabase.from('listas_precios').insert({ empresa_id: empresaId, ...l })
  if (error) throw error
}
export async function actualizarLista(id: string, cambios: ListaEditable) {
  const { error } = await supabase.from('listas_precios').update(cambios).eq('id', id)
  if (error) throw error
}

/** Sube la foto a publico/{empresa_id}/modelos/{modelo_id}-<marca de tiempo>.<ext>. */
export async function subirFotoModelo(empresaId: string, modeloId: string, archivo: File) {
  const ext = archivo.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const ruta = `${empresaId}/modelos/${modeloId}-${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from(BUCKET_PUBLICO)
    .upload(ruta, archivo, { contentType: archivo.type, cacheControl: '31536000', upsert: false })
  if (error) throw error
  return ruta
}
