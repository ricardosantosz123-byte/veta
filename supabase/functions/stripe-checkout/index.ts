// Edge Function `stripe-checkout`: el Admin se suscribe a Veta (PRD §5.11).
//
// POST { empresa_id, plan: 'taller' | 'muebleria', intervalo: 'mes' | 'anio' }
// 1. Con la sesión del Admin: confirma que es Admin de la empresa.
// 2. Crea (una sola vez) el customer de Stripe y lo liga con guardar_cliente_stripe.
// 3. Crea una Checkout Session mode=subscription con el precio del plan y, si la empresa ya
//    rebasa lo incluido, los usuarios adicionales que necesita (los montos viven en Stripe).
//    Metadata empresa_id. Devuelve { url }.
// El estado de la cuenta NO cambia aquí: lo cambia stripe-webhook cuando Stripe confirma el cobro.
//
// Secretos: STRIPE_SECRET_KEY, STRIPE_PRICE_<PLAN>_<MENSUAL|ANUAL>, STRIPE_PRICE_EXTRA_<MENSUAL|ANUAL>, APP_URL.
import { corsHeaders, json } from '../_shared/cors.ts'
import { clienteServicio, sesionDeUsuario, UUID } from '../_shared/sesion.ts'
import { catalogoPrecios, PLANES_A_LA_VENTA, stripeOpcional, type Plan } from '../_shared/stripe.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  const stripe = stripeOpcional()
  const precios = catalogoPrecios()
  const appUrl = Deno.env.get('APP_URL')?.replace(/\/$/, '')
  if (!stripe || !appUrl) {
    return json({ error: 'Los pagos de la suscripción aún no están configurados. Escríbenos a soporte.' }, 503)
  }

  const sesion = await sesionDeUsuario(req)
  if (sesion instanceof Response) return sesion

  let cuerpo: { empresa_id?: unknown; plan?: unknown; intervalo?: unknown }
  try {
    cuerpo = await req.json()
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400)
  }
  const empresaId = String(cuerpo.empresa_id ?? '')
  const intervalo = cuerpo.intervalo === 'anio' ? 'anio' : cuerpo.intervalo === 'mes' ? 'mes' : null
  const plan = PLANES_A_LA_VENTA.find((p) => p === cuerpo.plan) as Plan | undefined
  if (!UUID.test(empresaId) || !intervalo) return json({ error: 'Solicitud inválida.' }, 400)
  if (!plan) return json({ error: 'Ese plan aún no está a la venta.' }, 400)
  const precioPlan = precios.planes[plan][intervalo]
  const precioExtra = precios.extra[intervalo]
  if (!precioPlan || !precioExtra) {
    return json({ error: 'Los pagos de la suscripción aún no están configurados. Escríbenos a soporte.' }, 503)
  }

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

  // Si la empresa ya rebasa lo incluido, el pago trae los adicionales que necesita.
  const { data: uso } = await servicio.rpc('uso_plan', { p_empresa: empresaId })
  const extraNecesarios = Math.max(Number((uso as { extra_usados?: number } | null)?.extra_usados ?? 0), 0)

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
      line_items: [
        { price: precioPlan, quantity: 1 },
        ...(extraNecesarios > 0 ? [{ price: precioExtra, quantity: extraNecesarios }] : []),
      ],
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
