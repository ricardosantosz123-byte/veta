// Edge Function `stripe-webhook`: Stripe avisa cambios de la suscripción (pública, firma obligatoria).
//
// 1. Verifica la firma con STRIPE_WEBHOOK_SECRET (sin firma válida → 400 y no se toca nada).
// 2. Ignora eventos ya procesados (tabla stripe_eventos).
// 3. checkout.session.completed y customer.subscription.created/updated/deleted: vuelve a LEER la
//    suscripción en la API (el orden de los eventos no importa) y aplica su estado actual con
//    aplicar_suscripcion_stripe (mapeo del PRD §5.11).
// La empresa sale de metadata.empresa_id (la pone stripe-checkout) o, si falta, del customer.
//
// Secretos: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET. Se despliega con --no-verify-jwt.
import { clienteServicio, UUID } from '../_shared/sesion.ts'
import { proveedorCripto, resumenSuscripcion, stripeOpcional, type Stripe } from '../_shared/stripe.ts'

const respuesta = (status: number, detalle: string) =>
  new Response(JSON.stringify({ recibido: status < 300, detalle }), { status, headers: { 'Content-Type': 'application/json' } })

const EVENTOS = new Set(['checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'])

Deno.serve(async (req) => {
  if (req.method !== 'POST') return respuesta(405, 'metodo no permitido')
  const stripe = stripeOpcional()
  const secreto = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!stripe || !secreto) return respuesta(503, 'no configurado')

  const firma = req.headers.get('stripe-signature')
  if (!firma) return respuesta(400, 'sin firma')
  const cuerpo = await req.text()
  let evento: Stripe.Event
  try {
    evento = await stripe.webhooks.constructEventAsync(cuerpo, firma, secreto, undefined, proveedorCripto)
  } catch {
    return respuesta(400, 'firma inválida')
  }
  if (!EVENTOS.has(evento.type)) return respuesta(200, 'evento ignorado')

  const servicio = clienteServicio()
  const { data: visto } = await servicio.from('stripe_eventos').select('id').eq('id', evento.id).maybeSingle()
  if (visto) return respuesta(200, 'ya procesado')

  // Id de la suscripción del evento.
  let suscripcionId: string | null = null
  if (evento.type === 'checkout.session.completed') {
    const s = evento.data.object as Stripe.Checkout.Session
    if (s.mode !== 'subscription' || !s.subscription) return respuesta(200, 'checkout sin suscripción')
    suscripcionId = typeof s.subscription === 'string' ? s.subscription : s.subscription.id
  } else {
    suscripcionId = (evento.data.object as Stripe.Subscription).id
  }

  let resumen: ReturnType<typeof resumenSuscripcion>
  try {
    const suscripcion = await stripe.subscriptions.retrieve(suscripcionId, { expand: ['items.data.price'] })
    resumen = resumenSuscripcion(suscripcion)
  } catch {
    return respuesta(500, 'no se pudo leer la suscripción')  // Stripe reintenta
  }

  let empresaId = resumen.empresa_id
  if (!empresaId || !UUID.test(empresaId)) {
    const { data } = await servicio.from('empresas').select('id').eq('stripe_customer_id', resumen.customer).maybeSingle()
    empresaId = data?.id ?? null
  }
  if (!empresaId) return respuesta(200, 'suscripción sin empresa')

  const { error } = await servicio.rpc('aplicar_suscripcion_stripe', {
    p_empresa: empresaId,
    p_customer: resumen.customer,
    p_subscription: resumen.subscription,
    p_status: resumen.status,
    p_intervalo: resumen.intervalo,
    p_periodo_termina: resumen.periodo_termina,
    p_cancela_al_final: resumen.cancela_al_final,
  })
  if (error) {
    console.error('stripe-webhook', evento.id, error.message)
    return error.message.includes('no corresponde') ? respuesta(200, 'customer ajeno') : respuesta(500, 'no se pudo aplicar')
  }
  await servicio.from('stripe_eventos').insert({ id: evento.id, tipo: evento.type, empresa_id: empresaId })
  return respuesta(200, 'aplicado')
})
