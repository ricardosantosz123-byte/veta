// Edge Function `portal`: portal público del cliente final (PRD §5.8). Sin sesión.
//
//   GET  ?slug=…&token=…            → pedido del link único.
//   POST { slug, folio, apellidos } → buscador: folio + apellidos (sin acentos ni mayúsculas).
//
// Usa service_role solo para llamar a portal_pedido / portal_buscar (no toca tablas).
// Límite: 10 intentos por IP cada 10 minutos. Cuentan las búsquedas y los links que no existen;
// abrir un link válido no gasta intentos. La IP se guarda solo como SHA-256(IP + PORTAL_SALT).
// CORS: solo los orígenes de APP_ORIGINS (lista separada por comas; admite * en el host,
// p. ej. http://192.168.*:5173). Cualquier fallo de búsqueda responde el mismo 404 genérico.
//
// Se despliega sin verificación de JWT (es pública): npx supabase functions deploy portal --no-verify-jwt --use-api
import { createClient } from 'npm:@supabase/supabase-js@2'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SLUG = /^[a-z0-9-]{3,40}$/

const origenes = (Deno.env.get('APP_ORIGINS') ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)
  .map((o) => new RegExp('^' + o.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/:]*') + '$'))

function cors(origen: string | null): Record<string, string> {
  const base: Record<string, string> = {
    'Access-Control-Allow-Headers': 'apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    Vary: 'Origin',
  }
  if (origen && origenes.some((r) => r.test(origen))) base['Access-Control-Allow-Origin'] = origen
  return base
}

function responder(origen: string | null, cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...cors(origen), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

async function hashIp(req: Request, sal: string) {
  const ip =
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'desconocida'
  const datos = new TextEncoder().encode(`${ip}|${sal}`)
  const digest = await crypto.subtle.digest('SHA-256', datos)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** "P-12", "p 12", "#12" o "12" → 12. */
function leerFolio(v: unknown): number | null {
  const texto = String(v ?? '').trim().replace(/^p\s*-?\s*/i, '').replace(/^#/, '')
  return /^\d{1,9}$/.test(texto) ? Number(texto) : null
}

Deno.serve(async (req) => {
  const origen = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origen) })
  if (req.method !== 'GET' && req.method !== 'POST') return responder(origen, { error: 'metodo_no_permitido' }, 405)

  const sal = Deno.env.get('PORTAL_SALT')
  if (!sal || sal.length < 16) return responder(origen, { error: 'no_configurado' }, 503)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })
  const ip = await hashIp(req, sal)
  const noEncontrado = () => responder(origen, { error: 'no_encontrado' }, 404)

  const { data: permitido, error: errLimite } = await admin.rpc('portal_permitido', { p_ip_hash: ip })
  if (errLimite) return responder(origen, { error: 'error' }, 500)
  if (!permitido) return responder(origen, { error: 'demasiados_intentos' }, 429)

  let slug = ''
  let token: string | null = null

  if (req.method === 'GET') {
    const url = new URL(req.url)
    slug = (url.searchParams.get('slug') ?? '').trim().toLowerCase()
    token = url.searchParams.get('token')
    if (!SLUG.test(slug) || !token || !UUID.test(token)) {
      await admin.rpc('portal_registrar_intento', { p_ip_hash: ip })
      return noEncontrado()
    }
  } else {
    // Cada búsqueda cuenta, encuentre o no.
    await admin.rpc('portal_registrar_intento', { p_ip_hash: ip })
    let cuerpo: { slug?: unknown; folio?: unknown; apellidos?: unknown }
    try {
      cuerpo = await req.json()
    } catch {
      return noEncontrado()
    }
    slug = String(cuerpo.slug ?? '').trim().toLowerCase()
    const folio = leerFolio(cuerpo.folio)
    const apellidos = String(cuerpo.apellidos ?? '').slice(0, 120)
    if (!SLUG.test(slug) || folio === null || apellidos.trim().length < 3) return noEncontrado()
    const { data, error } = await admin.rpc('portal_buscar', { p_slug: slug, p_folio: folio, p_apellidos: apellidos })
    if (error) return responder(origen, { error: 'error' }, 500)
    if (!data) return noEncontrado()
    token = data as string
  }

  const { data: pedido, error } = await admin.rpc('portal_pedido', { p_token: token, p_slug: slug })
  if (error) return responder(origen, { error: 'error' }, 500)
  if (!pedido) {
    if (req.method === 'GET') await admin.rpc('portal_registrar_intento', { p_ip_hash: ip })
    return noEncontrado()
  }
  return responder(origen, { token, ...(pedido as Record<string, unknown>) })
})
