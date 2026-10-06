import Stripe from 'npm:stripe@23'

/** Cliente de Stripe o null si faltan los secretos (la función responde "no configurado"). */
export function stripeOpcional(): Stripe | null {
  const llave = Deno.env.get('STRIPE_SECRET_KEY')
  if (!llave) return null
  return new Stripe(llave, { httpClient: Stripe.createFetchHttpClient() })
}

export const proveedorCripto = Stripe.createSubtleCryptoProvider()

/** Datos que la base necesita de una suscripción (compatible con versiones de la API antes y después de 2025-03). */
export function resumenSuscripcion(s: Stripe.Subscription) {
  const item = s.items?.data?.[0]
  const intervalo = item?.price?.recurring?.interval
  const finPeriodo =
    (item as unknown as { current_period_end?: number } | undefined)?.current_period_end ??
    (s as unknown as { current_period_end?: number }).current_period_end ??
    null
  return {
    status: s.status,
    customer: typeof s.customer === 'string' ? s.customer : s.customer.id,
    subscription: s.id,
    intervalo: intervalo === 'month' ? 'mes' : intervalo === 'year' ? 'anio' : null,
    periodo_termina: finPeriodo ? new Date(finPeriodo * 1000).toISOString() : null,
    cancela_al_final: !!s.cancel_at_period_end || !!s.cancel_at,
    empresa_id: (s.metadata?.empresa_id as string | undefined) ?? null,
  }
}

export type { Stripe }
