import { supabase, type Tablas } from '@/lib/supabase'

export const BUCKET_PUBLICO = 'publico'
export const LOGO_TIPOS = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
export const LOGO_MAX_BYTES = 5 * 1024 * 1024

/** Valida tipo y tamaño de una imagen (mismas reglas que el bucket publico). */
export function validarImagen(f: File): string | null {
  if (!LOGO_TIPOS.includes(f.type)) return 'Usa una imagen PNG, JPG, WEBP o SVG.'
  if (f.size > LOGO_MAX_BYTES) return 'La imagen pesa más de 5 MB.'
  return null
}

/** "Mueblería Sauce & Hijos" → "muebleria-sauce-hijos" */
export function sugerirSlug(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
}

export async function slugDisponible(slug: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('slug_disponible', { p_slug: slug })
  if (error) throw error
  return data
}

export async function crearEmpresa(nombre: string, slug: string): Promise<string> {
  const { data, error } = await supabase.rpc('crear_empresa', { p_nombre: nombre, p_slug: slug })
  if (error) throw error
  return data
}

export async function leerEmpresa(id: string) {
  const { data, error } = await supabase.from('empresas').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

// Solo las columnas que el Admin puede editar (grant por columna en la migración inicial).
export type EmpresaEditable = Pick<
  Tablas['empresas']['Update'],
  | 'nombre'
  | 'razon_social'
  | 'rfc'
  | 'telefono'
  | 'email'
  | 'direccion'
  | 'logo_path'
  | 'color_marca'
  | 'metodo_precio'
  | 'iva'
  | 'vigencia_cotizacion_dias'
  | 'anticipo_pct'
  | 'condiciones_cotizacion'
>

export async function actualizarEmpresa(id: string, cambios: EmpresaEditable) {
  const { error } = await supabase.from('empresas').update(cambios).eq('id', id)
  if (error) throw error
}

/** Sube el logo a publico/{empresa_id}/logo-<marca de tiempo>.<ext> y devuelve la ruta. */
export async function subirLogo(empresaId: string, archivo: File): Promise<string> {
  const ext = archivo.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png'
  const ruta = `${empresaId}/logo-${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from(BUCKET_PUBLICO)
    .upload(ruta, archivo, { contentType: archivo.type, cacheControl: '31536000', upsert: false })
  if (error) throw error
  return ruta
}

export async function borrarArchivoPublico(ruta: string) {
  await supabase.storage.from(BUCKET_PUBLICO).remove([ruta])
}

export function urlPublica(ruta: string | null | undefined): string | null {
  if (!ruta) return null
  return supabase.storage.from(BUCKET_PUBLICO).getPublicUrl(ruta).data.publicUrl
}
