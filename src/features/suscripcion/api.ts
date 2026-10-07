import { invocar } from '@/lib/funciones'
import { supabase } from '@/lib/supabase'

export async function leerSuscripcion(empresaId: string) {
  const { data, error } = await supabase
    .from('empresas')
    .select('estado_suscripcion, prueba_termina, plan, plan_intervalo, periodo_termina, cancela_al_final, stripe_customer_id, usuarios_extra')
    .eq('id', empresaId)
    .single()
  if (error) throw error
  return data
}
export type Suscripcion = Awaited<ReturnType<typeof leerSuscripcion>>

export interface UsoPlan {
  plan: string
  oficina: number
  oficina_incluidos: number
  proveedores: number
  proveedores_incluidos: number
  extra: number
  extra_usados: number
  excedido: boolean
}

/** Lugares ocupados del plan (miembros activos + invitaciones pendientes). Lo calcula la base. */
export async function leerUsoPlan(empresaId: string) {
  const { data, error } = await supabase.rpc('uso_plan', { p_empresa: empresaId })
  if (error) throw error
  return data as unknown as UsoPlan
}

/** Edge Function stripe-checkout → URL de la página de pago de Stripe. */
export function iniciarSuscripcion(empresaId: string, plan: string, intervalo: 'mes' | 'anio') {
  return invocar<{ url: string }>('stripe-checkout', { empresa_id: empresaId, plan, intervalo }, 'No pudimos abrir el pago. Intenta de nuevo.')
}

/** Edge Function stripe-extras: cambia los usuarios adicionales de una suscripción activa. */
export function cambiarUsuariosExtra(empresaId: string, cantidad: number) {
  return invocar<{ ok: true }>('stripe-extras', { empresa_id: empresaId, cantidad }, 'No pudimos actualizar tus usuarios adicionales. Intenta de nuevo.')
}

/** Edge Function stripe-portal → Portal de Cliente de Stripe (tarjeta, facturas, cancelar). */
export function abrirPortalPago(empresaId: string) {
  return invocar<{ url: string }>('stripe-portal', { empresa_id: empresaId }, 'No pudimos abrir el portal de pago. Intenta de nuevo.')
}
