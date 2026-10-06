import { invocar } from '@/lib/funciones'
import { supabase } from '@/lib/supabase'

export async function leerSuscripcion(empresaId: string) {
  const { data, error } = await supabase
    .from('empresas')
    .select('estado_suscripcion, prueba_termina, plan_intervalo, periodo_termina, cancela_al_final, stripe_customer_id')
    .eq('id', empresaId)
    .single()
  if (error) throw error
  return data
}
export type Suscripcion = Awaited<ReturnType<typeof leerSuscripcion>>

/** Edge Function stripe-checkout → URL de la página de pago de Stripe. */
export function iniciarSuscripcion(empresaId: string, intervalo: 'mes' | 'anio') {
  return invocar<{ url: string }>('stripe-checkout', { empresa_id: empresaId, intervalo }, 'No pudimos abrir el pago. Intenta de nuevo.')
}

/** Edge Function stripe-portal → Portal de Cliente de Stripe (tarjeta, facturas, cancelar). */
export function abrirPortalPago(empresaId: string) {
  return invocar<{ url: string }>('stripe-portal', { empresa_id: empresaId }, 'No pudimos abrir el portal de pago. Intenta de nuevo.')
}
