import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2'
import { json } from './cors.ts'

/** Cliente con la sesión de quien llama (todo pasa por RLS) o la respuesta de error lista. */
export async function sesionDeUsuario(req: Request): Promise<{ cliente: SupabaseClient; usuario: User } | Response> {
  const authorization = req.headers.get('Authorization')
  if (!authorization) return json({ error: 'Inicia sesión primero.' }, 401)
  const cliente = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
  const { data, error } = await cliente.auth.getUser()
  if (error || !data.user) return json({ error: 'Tu sesión expiró. Vuelve a entrar.' }, 401)
  return { cliente, usuario: data.user }
}

/** Cliente con service_role: solo para lo que la sesión del usuario no puede (secretos, RPC de sistema). */
export function clienteServicio(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
