// Edge Function `stripe-checkout`: el Admin se suscribe a Veta (PRD §5.11).
//
// POST { empresa_id, intervalo: 'mes' | 'anio' }
// 1. Con la sesión del Admin: confirma que es Admin de la empresa.
// 2. Crea (una sola vez) el customer de Stripe y lo liga con guardar_cliente_stripe.
// 3. Crea una Checkout Session mode=subscription con STRIPE_PRICE_MENSUAL o STRIPE_PRICE_ANUAL
//    (los montos viven en Stripe, no en el código) y metadata empresa_id. Devuelve { url }.
// El estado de la cuenta NO cambia aquí: lo cambia stripe-webhook cuando Stripe confirma el cobro.
//
// Secretos: STRIPE_SECRET_KEY, STRIPE_PRICE_MENSUAL, STRIPE_PRICE_ANUAL, APP_URL.
import { corsHeaders, json } from '../_shared/cors.ts'
import { clienteServicio, sesionDeUsuario, UUID } from '../_shared/sesion.ts'
import { stripeOpcional } from '../_shared/stripe.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  const stripe = stripeOpcional()
  const precios = { mes: Deno.env.get('STRIPE_PRICE_MENSUAL'), anio: Deno.env.get('STRIPE_PRICE_ANUAL') }
  const appUrl = Deno.env.get('APP_URL')?.replace(/\/$/, '')
  if (!stripe || !precios.mes || !precios.anio || !appUrl) {
    return json({ error: 'Los pagos de la suscripción aún no están configurados. Escríbenos a soporte.' }, 503)
  }

  const sesion = await sesionDeUsuario(req)
  if (sesion instanceof Response) return sesion

  let cuerpo: { empresa_id?: unknown; intervalo?: unknown }
  try {
    cuerpo = await req.json()
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400)
  }
  const empresaId = String(cuerpo.empresa_id ?? '')
  const intervalo = cuerpo.intervalo === 'anio' ? 'anio' : cuerpo.intervalo === 'mes' ? 'mes' : null
  if (!UUID.test(empresaId) || !intervalo) return json({ error: 'Solicitud inválida.' }, 400)

  const { data: esAdmin } = await sesion.cliente.rpc('tiene_rol', { p_empresa: empresaId, p_roles: ['admin'] })
  if (!esAdmin) return json({ error: 'Solo el Admin puede administrar la suscripción.' }, 403)

  const servicio = clienteServicio()
  const { data: empresa, error } = await servicio
    .from('empresas')
    .select('id, nombre, email, estado_suscripcion, stripe_customer_id, stripe_subscription_id')
    .eq('id', empresaId)
    .single()
  if (error || !empresa) return json({ error: 'Empresa no encontrada.' }, 404)
  if (empresa.estado_suscripcion === 'activa' && empresa.stripe_subscription_id) {
    return json({ error: 'Ya tienes una suscripción activa. Usa "Administrar pago" para cambiar de plan o de tarjeta.' }, 409)
  }

  try {
    let customer = empresa.stripe_customer_id as string | null
    if (!customer) {
      const creado = await stripe.customers.create(
        { name: empresa.nombre, email: empresa.email ?? sesion.usuario.email ?? undefined, metadata: { empresa_id: empresaId } },
        { idempotencyKey: `customer-${empresaId}` },
      )
      customer = creado.id
      const { error: errCliente } = await servicio.rpc('guardar_cliente_stripe', { p_empresa: empresaId, p_customer: customer })
      if (errCliente) return json({ error: 'No pudimos preparar tu cuenta de pago. Intenta de nuevo.' }, 500)
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer,
      client_reference_id: empresaId,
      line_items: [{ price: precios[intervalo], quantity: 1 }],
      metadata: { empresa_id: empresaId },
      subscription_data: { metadata: { empresa_id: empresaId } },
      allow_promotion_codes: true,
      locale: 'es-419',
      success_url: `${appUrl}/suscripcion?estado=ok`,
      cancel_url: `${appUrl}/suscripcion?estado=cancelado`,
    })
    if (!checkout.url) return json({ error: 'Stripe no devolvió la página de pago.' }, 502)
    return json({ url: checkout.url })
  } catch (e) {
    console.error('stripe-checkout', e instanceof Error ? e.message : e)
    return json({ error: 'No pudimos abrir el pago con Stripe. Intenta en unos minutos.' }, 502)
  }
})
