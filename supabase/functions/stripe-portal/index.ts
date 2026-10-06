// Edge Function `stripe-portal`: el Admin abre el Portal de Cliente de Stripe (tarjeta, facturas, cancelar).
//
// POST { empresa_id } → { url }
// Secretos: STRIPE_SECRET_KEY, APP_URL. El Portal de Cliente debe estar activado en el panel de Stripe.
import { corsHeaders, json } from '../_shared/cors.ts'
import { clienteServicio, sesionDeUsuario, UUID } from '../_shared/sesion.ts'
import { stripeOpcional } from '../_shared/stripe.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  const stripe = stripeOpcional()
  const appUrl = Deno.env.get('APP_URL')?.replace(/\/$/, '')
  if (!stripe || !appUrl) return json({ error: 'Los pagos de la suscripción aún no están configurados. Escríbenos a soporte.' }, 503)

  const sesion = await sesionDeUsuario(req)
  if (sesion instanceof Response) return sesion

  let cuerpo: { empresa_id?: unknown }
  try {
    cuerpo = await req.json()
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400)
  }
  const empresaId = String(cuerpo.empresa_id ?? '')
  if (!UUID.test(empresaId)) return json({ error: 'Solicitud inválida.' }, 400)

  const { data: esAdmin } = await sesion.cliente.rpc('tiene_rol', { p_empresa: empresaId, p_roles: ['admin'] })
  if (!esAdmin) return json({ error: 'Solo el Admin puede administrar la suscripción.' }, 403)

  const { data: empresa } = await clienteServicio().from('empresas').select('stripe_customer_id').eq('id', empresaId).single()
  if (!empresa?.stripe_customer_id) return json({ error: 'Aún no tienes una suscripción. Elige un plan primero.' }, 400)

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: empresa.stripe_customer_id,
      return_url: `${appUrl}/suscripcion`,
      locale: 'es-419',
    })
    return json({ url: portal.url })
  } catch (e) {
    console.error('stripe-portal', e instanceof Error ? e.message : e)
    return json({ error: 'No pudimos abrir el portal de Stripe. Intenta en unos minutos.' }, 502)
  }
})
