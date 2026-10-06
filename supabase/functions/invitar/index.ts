// Edge Function `invitar`: el Admin invita a alguien a su empresa con un rol.
//
// 1. Inserta (o actualiza, si ya había una pendiente) la invitación con la sesión del Admin:
//    RLS valida que sea Admin de esa empresa y que la cuenta pueda escribir.
// 2. Si Resend está configurado, genera un enlace mágico con service_role y lo envía
//    directamente al invitado. El enlace NUNCA se devuelve al Admin: le daría acceso a otra cuenta.
// 3. Al iniciar sesión, la app llama aceptar_invitaciones() y la invitación se vuelve membresía.
//
// Secretos: APP_URL (obligatorio), RESEND_API_KEY y EMAIL_FROM (opcionales: sin ellos solo se
// registra la invitación y el Admin avisa por WhatsApp). SUPABASE_* los inyecta Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

const ROLES = ['admin', 'vendedor', 'produccion', 'destajista', 'contador'] as const
type Rol = (typeof ROLES)[number]

const NOMBRE_ROL: Record<Rol, string> = {
  admin: 'Admin',
  vendedor: 'Vendedor',
  produccion: 'Producción',
  destajista: 'Proveedor (fabricante)',
  contador: 'Contador',
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Entrada {
  empresa_id: string
  email: string
  rol: Rol
  destajista_id: string | null
}

function validar(cuerpo: unknown): Entrada | string {
  if (!cuerpo || typeof cuerpo !== 'object') return 'Solicitud inválida.'
  const c = cuerpo as Record<string, unknown>
  const email = typeof c.email === 'string' ? c.email.trim().toLowerCase() : ''
  const rol = c.rol as Rol
  const destajista_id = typeof c.destajista_id === 'string' && c.destajista_id ? c.destajista_id : null
  if (typeof c.empresa_id !== 'string' || !UUID.test(c.empresa_id)) return 'Empresa inválida.'
  if (!EMAIL.test(email) || email.length > 254) return 'Ese correo no es válido.'
  if (!ROLES.includes(rol)) return 'Rol inválido.'
  if (rol === 'destajista' && (!destajista_id || !UUID.test(destajista_id))) return 'Elige el proveedor.'
  return { empresa_id: c.empresa_id, email, rol, destajista_id: rol === 'destajista' ? destajista_id : null }
}

function escapar(t: string) {
  return t.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!)
}

function correoHtml(empresa: string, rol: Rol, enlace: string) {
  return `<!doctype html><html lang="es-MX"><body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1d1d1f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:12px;border:1px solid #e5e5e5">
<tr><td style="padding:32px">
<p style="margin:0 0 8px;font-size:14px;color:#6e6e73">Invitación</p>
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">${escapar(empresa)} te invitó a Veta</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.5">Tu rol será <strong>${NOMBRE_ROL[rol]}</strong>. Entra con este botón; no necesitas contraseña.</p>
<a href="${escapar(enlace)}" style="display:inline-block;background:#1d1d1f;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:15px;font-weight:600">Entrar a Veta</a>
<p style="margin:24px 0 0;font-size:13px;color:#6e6e73;line-height:1.5">El enlace es personal y vence pronto. Si no esperabas este correo, ignóralo.</p>
</td></tr></table></td></tr></table></body></html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  const authorization = req.headers.get('Authorization')
  if (!authorization) return json({ error: 'Inicia sesión primero.' }, 401)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const appUrl = Deno.env.get('APP_URL')
  if (!appUrl) return json({ error: 'Falta configurar APP_URL en los secretos de la función.' }, 500)

  // Cliente con la sesión del Admin: todo lo que toca tablas pasa por RLS.
  const comoUsuario = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
  const { data: auth, error: authError } = await comoUsuario.auth.getUser()
  if (authError || !auth.user) return json({ error: 'Tu sesión expiró. Vuelve a entrar.' }, 401)

  let cuerpo: unknown
  try {
    cuerpo = await req.json()
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400)
  }
  const entrada = validar(cuerpo)
  if (typeof entrada === 'string') return json({ error: entrada }, 400)
  const { empresa_id, email, rol, destajista_id } = entrada

  const { data: empresa } = await comoUsuario.from('empresas').select('nombre').eq('id', empresa_id).maybeSingle()
  if (!empresa) return json({ error: 'No perteneces a esa empresa.' }, 403)

  // Una sola invitación pendiente por correo y empresa (índice único parcial): si ya existe, se actualiza.
  const { data: pendiente, error: errLectura } = await comoUsuario
    .from('invitaciones')
    .select('id')
    .eq('empresa_id', empresa_id)
    .eq('email', email)
    .is('aceptada_at', null)
    .maybeSingle()
  if (errLectura) return json({ error: 'Solo el Admin puede invitar usuarios.' }, 403)

  const escritura = pendiente
    ? comoUsuario.from('invitaciones').update({ rol, destajista_id }).eq('id', pendiente.id).select('id').single()
    : comoUsuario
        .from('invitaciones')
        .insert({ empresa_id, email, rol, destajista_id, created_by: auth.user.id })
        .select('id')
        .single()
  const { data: invitacion, error: errEscritura } = await escritura
  if (errEscritura || !invitacion) {
    const sinPermiso = errEscritura?.code === '42501' || errEscritura?.message?.includes('row-level security')
    return json(
      {
        error: sinPermiso
          ? 'No puedes invitar: solo el Admin puede hacerlo y la cuenta debe estar activa.'
          : 'No pudimos guardar la invitación. Revisa los datos e intenta de nuevo.',
      },
      sinPermiso ? 403 : 400,
    )
  }

  // Correo opcional con Resend.
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const emailFrom = Deno.env.get('EMAIL_FROM')
  let correo: 'enviado' | 'no_configurado' | 'error' = 'no_configurado'

  if (resendKey && emailFrom) {
    try {
      const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
      const opciones = { redirectTo: appUrl }
      let link = await admin.auth.admin.generateLink({ type: 'magiclink', email, options: opciones })
      if (link.error) link = await admin.auth.admin.generateLink({ type: 'invite', email, options: opciones })
      if (link.error || !link.data.properties?.action_link) throw link.error ?? new Error('sin enlace')

      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: emailFrom,
          to: [email],
          subject: `${empresa.nombre} te invitó a Veta`,
          html: correoHtml(empresa.nombre, rol, link.data.properties.action_link),
        }),
      })
      if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`)
      correo = 'enviado'
    } catch (e) {
      console.error('invitar: correo', e)
      correo = 'error'
    }
  }

  return json({ ok: true, invitacion_id: invitacion.id, reenviada: !!pendiente, correo })
})
