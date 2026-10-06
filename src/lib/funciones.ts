import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/** Llama una Edge Function con la sesión actual. Sus errores llegan como { error: "mensaje en español" }. */
export async function invocar<T>(nombre: string, cuerpo: Record<string, unknown>, mensaje: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(nombre, { body: cuerpo })
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const respuesta = await error.context.json().catch(() => null)
      throw new Error(respuesta?.error ?? mensaje)
    }
    throw new Error('No pudimos contactar al servidor. Revisa tu conexión.')
  }
  return data as T
}
