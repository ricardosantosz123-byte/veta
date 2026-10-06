// Edge Function `mp-conectar`: el Admin conecta la cuenta de Mercado Pago de SU mueblería (PRD §5.5).
//
// POST { empresa_id, access_token }
// 1. Con la sesión del Admin: confirma que es Admin de esa empresa y que la cuenta puede escribir.
// 2. Valida el token contra la API de Mercado Pago (GET /users/me).
// 3. Con service_role: mp_guardar_conexion guarda el token en empresa_secretos (nunca vuelve al navegador)
//    y marca empresas.mp_conectado con el apodo de la cuenta.
// Desconectar no pasa por aquí: la app llama la RPC mp_desconectar (solo Admin).
// Secretos: ninguno propio (el token es de cada mueblería). SUPABASE_* los inyecta Supabase.
import { json, corsHeaders } from '../_shared/cors.ts'
import { clienteServicio, sesionDeUsuario, UUID } from '../_shared/sesion.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  const sesion = await sesionDeUsuario(req)
  if (sesion instanceof Response) return sesion

  let cuerpo: { empresa_id?: unknown; access_token?: unknown }
  try {
    cuerpo = await req.json()
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400)
  }
  const empresaId = String(cuerpo.empresa_id ?? '')
  const token = String(cuerpo.access_token ?? '').trim()
  if (!UUID.test(empresaId)) return json({ error: 'Empresa inválida.' }, 400)
  if (!/^(APP_USR|TEST)-[\w-]{20,}$/.test(token)) {
    return json({ error: 'Ese no parece un Access Token de Mercado Pago. Empieza con APP_USR- y es largo; cópialo completo.' }, 400)
  }

  const [{ data: esAdmin }, { data: activa }] = await Promise.all([
    sesion.cliente.rpc('tiene_rol', { p_empresa: empresaId, p_roles: ['admin'] }),
    sesion.cliente.rpc('puede_escribir', { p_empresa: empresaId }),
  ])
  if (!esAdmin) return json({ error: 'Solo el Admin puede conectar Mercado Pago.' }, 403)
  if (!activa) return json({ error: 'Cuenta en solo lectura: activa tu suscripción.' }, 403)

  let cuenta: { id?: number; nickname?: string; email?: string; site_id?: string }
  try {
    const r = await fetch('https://api.mercadopago.com/users/me', { headers: { Authorization: `Bearer ${token}` } })
    if (r.status === 401 || r.status === 403) return json({ error: 'Mercado Pago rechazó el token. Revisa que sea el Access Token de producción y que esté completo.' }, 400)
    if (!r.ok) return json({ error: 'Mercado Pago no respondió. Intenta en unos minutos.' }, 502)
    cuenta = await r.json()
  } catch {
    return json({ error: 'No pudimos comunicarnos con Mercado Pago. Intenta en unos minutos.' }, 502)
  }
  if (cuenta.site_id && cuenta.site_id !== 'MLM') {
    return json({ error: 'La cuenta de Mercado Pago debe ser de México.' }, 400)
  }

  const nombre = cuenta.nickname ?? cuenta.email ?? (cuenta.id ? `Cuenta ${cuenta.id}` : 'Mercado Pago')
  const { error } = await clienteServicio().rpc('mp_guardar_conexion', { p_empresa: empresaId, p_token: token, p_cuenta: nombre })
  if (error) return json({ error: 'No pudimos guardar la conexión. Intenta de nuevo.' }, 500)
  return json({ conectado: true, cuenta: nombre })
})
