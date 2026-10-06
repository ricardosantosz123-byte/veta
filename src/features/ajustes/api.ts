import { FunctionsHttpError } from '@supabase/supabase-js'
import type { Rol } from '@/lib/permisos'
import { supabase } from '@/lib/supabase'

export async function leerMiembros(empresaId: string) {
  const { data, error } = await supabase
    .from('miembros')
    .select('id, user_id, rol, nombre, activo, destajista_id, created_at, destajista:destajistas(nombre)')
    .eq('empresa_id', empresaId)
    .order('created_at')
  if (error) throw error
  return data
}
export type Miembro = Awaited<ReturnType<typeof leerMiembros>>[number]

export async function leerInvitacionesPendientes(empresaId: string) {
  const { data, error } = await supabase
    .from('invitaciones')
    .select('id, email, rol, destajista_id, created_at, destajista:destajistas(nombre)')
    .eq('empresa_id', empresaId)
    .is('aceptada_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
export type Invitacion = Awaited<ReturnType<typeof leerInvitacionesPendientes>>[number]

export async function leerDestajistas(empresaId: string) {
  const { data, error } = await supabase
    .from('destajistas')
    .select('id, nombre, especialidad, telefono')
    .eq('empresa_id', empresaId)
    .eq('activo', true)
    .order('nombre')
  if (error) throw error
  return data
}

export async function crearDestajista(
  empresaId: string,
  d: { nombre: string; telefono: string | null; especialidad: string | null; email: string | null },
) {
  const { data, error } = await supabase
    .from('destajistas')
    .insert({ empresa_id: empresaId, ...d })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export interface ResultadoInvitacion {
  ok: true
  invitacion_id: string
  reenviada: boolean
  correo: 'enviado' | 'no_configurado' | 'error'
}

export async function invitar(entrada: {
  empresa_id: string
  email: string
  rol: Rol
  destajista_id: string | null
}): Promise<ResultadoInvitacion> {
  const { data, error } = await supabase.functions.invoke<ResultadoInvitacion>('invitar', { body: entrada })
  if (error) {
    // La función responde { error: "mensaje en español" } con su código HTTP.
    if (error instanceof FunctionsHttpError) {
      const cuerpo = await error.context.json().catch(() => null)
      throw new Error(cuerpo?.error ?? 'No pudimos enviar la invitación.')
    }
    throw new Error('No pudimos contactar al servidor. Revisa tu conexión.')
  }
  return data!
}

export async function cancelarInvitacion(id: string) {
  const { error } = await supabase.from('invitaciones').delete().eq('id', id)
  if (error) throw error
}

export async function cambiarRol(miembroId: string, rol: Rol, destajistaId: string | null) {
  const { error } = await supabase
    .from('miembros')
    .update({ rol, destajista_id: rol === 'destajista' ? destajistaId : null })
    .eq('id', miembroId)
  if (error) throw error
}

export async function cambiarActivo(miembroId: string, activo: boolean) {
  const { error } = await supabase.from('miembros').update({ activo }).eq('id', miembroId)
  if (error) throw error
}
