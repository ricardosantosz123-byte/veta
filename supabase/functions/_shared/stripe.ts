import Stripe from 'npm:stripe@23'

/** Cliente de Stripe o null si faltan los secretos (la función responde "no configurado"). */
export function stripeOpcional(): Stripe | null {
  const llave = Deno.env.get('STRIPE_SECRET_KEY')
  if (!llave) return null
  return new Stripe(llave, { httpClient: Stripe.createFetchHttpClient() })
}

export const proveedorCripto = Stripe.createSubtleCryptoProvider()

export type Plan = 'taller' | 'muebleria' | 'despacho'
export type Intervalo = 'mes' | 'anio'
export const PLANES: Plan[] = ['taller', 'muebleria', 'despacho']
/** Despacho de Interiores se vende cuando exista el módulo de Proyectos (decisión del 2026-10-06). */
export const PLANES_A_LA_VENTA: Plan[] = ['taller', 'muebleria']

/**
 * Precios de Stripe por plan e intervalo, más el usuario adicional. Los montos viven en Stripe:
 * Taller $300 · Mueblería $500 · Despacho $500 al mes (IVA incluido); anual = 10 meses.
 * Usuario adicional $100 al mes o $1,000 al año (Stripe exige el mismo intervalo en toda la suscripción).
 */
export function catalogoPrecios() {
  const leer = (n: string) => Deno.env.get(n) || null
  const planes: Record<Plan, Record<Intervalo, string | null>> = {
    taller: { mes: leer('STRIPE_PRICE_TALLER_MENSUAL'), anio: leer('STRIPE_PRICE_TALLER_ANUAL') },
    muebleria: { mes: leer('STRIPE_PRICE_MUEBLERIA_MENSUAL'), anio: leer('STRIPE_PRICE_MUEBLERIA_ANUAL') },
    despacho: { mes: leer('STRIPE_PRICE_DESPACHO_MENSUAL'), anio: leer('STRIPE_PRICE_DESPACHO_ANUAL') },
  }
  const extra: Record<Intervalo, string | null> = { mes: leer('STRIPE_PRICE_EXTRA_MENSUAL'), anio: leer('STRIPE_PRICE_EXTRA_ANUAL') }
  const planDePrecio = (precio: string): Plan | null => PLANES.find((p) => planes[p].mes === precio || planes[p].anio === precio) ?? null
  const esExtra = (precio: string) => precio === extra.mes || precio === extra.anio
  return { planes, extra, planDePrecio, esExtra }
}

/** Datos que la base necesita de una suscripción (compatible con versiones de la API antes y después de 2025-03). */
export function resumenSuscripcion(s: Stripe.Subscription) {
  const { planDePrecio, esExtra } = catalogoPrecios()
  const items = s.items?.data ?? []
  const itemPlan = items.find((i) => i.price && planDePrecio(i.price.id))
  const itemExtra = items.find((i) => i.price && esExtra(i.price.id))
  const item = itemPlan ?? items[0]
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
    plan: itemPlan?.price ? planDePrecio(itemPlan.price.id) : null,
    usuarios_extra: itemExtra?.quantity ?? 0,
    item_extra: itemExtra?.id ?? null,
  }
}

export type { Stripe }
