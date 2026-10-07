// Edge Function `stripe-extras`: el Admin cambia cuántos usuarios adicionales tiene contratados.
//
// POST { empresa_id, cantidad } → { ok: true }
// 1. Con la sesión del Admin: confirma que es Admin de la empresa.
// 2. Exige una suscripción activa de Stripe (durante la prueba no se cobran adicionales).
// 3. No deja bajar de los adicionales que ya están en uso (uso_plan.extra_usados): primero hay
//    que desactivar usuarios o cancelar invitaciones.
// 4. Cambia la cantidad del renglón de usuario adicional (lo agrega o lo quita si hace falta), con
//    prorrateo. La base NO cambia aquí: la actualiza stripe-webhook al recibir el cambio de Stripe.
//
// Secretos: STRIPE_SECRET_KEY, STRIPE_PRICE_EXTRA_MENSUAL, STRIPE_PRICE_EXTRA_ANUAL.
import { corsHeaders, json } from '../_shared/cors.ts'
import { clienteServicio, sesionDeUsuario, UUID } from '../_shared/sesion.ts'
import { catalogoPrecios, resumenSuscripcion, stripeOpcional } from '../_shared/stripe.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  const stripe = stripeOpcional()
  const { extra } = catalogoPrecios()
  if (!stripe || !extra.mes || !extra.anio) {
    return json({ error: 'Los pagos de la suscripción aún no están configurados. Escríbenos a soporte.' }, 503)
  }

  const sesion = await sesionDeUsuario(req)
  if (sesion instanceof Response) return sesion

  let cuerpo: { empresa_id?: unknown; cantidad?: unknown }
  try {
    cuerpo = await req.json()
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400)
  }
  const empresaId = String(cuerpo.empresa_id ?? '')
  const cantidad = Number(cuerpo.cantidad)
  if (!UUID.test(empresaId) || !Number.isInteger(cantidad) || cantidad < 0 || cantidad > 500) {
    return json({ error: 'Solicitud inválida.' }, 400)
  }

  const { data: esAdmin } = await sesion.cliente.rpc('tiene_rol', { p_empresa: empresaId, p_roles: ['admin'] })
  if (!esAdmin) return json({ error: 'Solo el Admin puede administrar la suscripción.' }, 403)

  const servicio = clienteServicio()
  const { data: empresa } = await servicio
    .from('empresas')
    .select('estado_suscripcion, stripe_subscription_id')
    .eq('id', empresaId)
    .single()
  if (!empresa?.stripe_subscription_id || empresa.estado_suscripcion !== 'activa') {
    return json({ error: 'Primero elige tu plan. Los usuarios adicionales se agregan a una suscripción activa.' }, 409)
  }

  const { data: uso } = await servicio.rpc('uso_plan', { p_empresa: empresaId })
  const enUso = Number((uso as { extra_usados?: number } | null)?.extra_usados ?? 0)
  if (cantidad < enUso) {
    return json({ error: `Tienes ${enUso} usuarios adicionales en uso. Desactiva usuarios o cancela invitaciones antes de bajar a ${cantidad}.` }, 409)
  }

  try {
    const suscripcion = await stripe.subscriptions.retrieve(empresa.stripe_subscription_id, { expand: ['items.data.price'] })
    const resumen = resumenSuscripcion(suscripcion)
    const precioExtra = resumen.intervalo === 'anio' ? extra.anio : extra.mes
    const idem = `extras-${empresaId}-${resumen.usuarios_extra}-${cantidad}`
    if (resumen.item_extra && cantidad === 0) {
      await stripe.subscriptionItems.del(resumen.item_extra, { proration_behavior: 'create_prorations' })
    } else if (resumen.item_extra) {
      await stripe.subscriptionItems.update(resumen.item_extra, { quantity: cantidad, proration_behavior: 'create_prorations' }, { idempotencyKey: idem })
    } else if (cantidad > 0) {
      await stripe.subscriptionItems.create(
        { subscription: suscripcion.id, price: precioExtra, quantity: cantidad, proration_behavior: 'create_prorations' },
        { idempotencyKey: idem },
      )
    }
    return json({ ok: true })
  } catch (e) {
    console.error('stripe-extras', e instanceof Error ? e.message : e)
    return json({ error: 'No pudimos actualizar tus usuarios adicionales. Intenta en unos minutos.' }, 502)
  }
})
