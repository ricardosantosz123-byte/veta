// Edge Function `mp-crear-link`: Admin o Vendedor generan un link de Checkout Pro para un pedido.
//
// POST { pedido_id, monto }
// 1. Con la sesión de quien llama: preparar_link_pago valida rol, cuenta activa, conexión y monto (≤ saldo).
// 2. Con service_role: lee el token de la mueblería y crea la preferencia en Mercado Pago:
//    external_reference = pedido_id, notification_url = mp-webhook?empresa=<id>, back_urls al portal.
// 3. registrar_link_pago guarda el link (y cancela el activo anterior). Devuelve { url }.
// Secretos: APP_URL (para volver al portal). SUPABASE_* los inyecta Supabase.
import { json, corsHeaders } from '../_shared/cors.ts'
import { clienteServicio, sesionDeUsuario, UUID } from '../_shared/sesion.ts'

interface Preparado {
  empresa_id: string
  empresa: string
  slug: string
  pedido_id: string
  folio: number
  token_portal: string
  monto: number
  concepto: 'anticipo' | 'saldo' | 'otro'
}

const CONCEPTO = { anticipo: 'Anticipo', saldo: 'Saldo', otro: 'Pago' } as const

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  const sesion = await sesionDeUsuario(req)
  if (sesion instanceof Response) return sesion

  const appUrl = Deno.env.get('APP_URL')?.replace(/\/$/, '')
  if (!appUrl) return json({ error: 'Falta configurar APP_URL en los secretos de la función.' }, 500)

  let cuerpo: { pedido_id?: unknown; monto?: unknown }
  try {
    cuerpo = await req.json()
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400)
  }
  const pedidoId = String(cuerpo.pedido_id ?? '')
  const monto = Number(cuerpo.monto)
  if (!UUID.test(pedidoId) || !Number.isFinite(monto)) return json({ error: 'Solicitud inválida.' }, 400)

  const { data, error } = await sesion.cliente.rpc('preparar_link_pago', { p_pedido: pedidoId, p_monto: monto })
  if (error) return json({ error: error.message }, 400)
  const p = data as Preparado

  const servicio = clienteServicio()
  const { data: secreto } = await servicio.from('empresa_secretos').select('mp_access_token').eq('empresa_id', p.empresa_id).maybeSingle()
  if (!secreto?.mp_access_token) return json({ error: 'Conecta Mercado Pago en Ajustes > Cobros en línea.' }, 400)

  const portal = `${appUrl}/${p.slug}/p/${p.token_portal}`
  const preferencia = {
    items: [{ id: `P-${p.folio}`, title: `${CONCEPTO[p.concepto]} del pedido P-${p.folio} · ${p.empresa}`, quantity: 1, unit_price: Number(p.monto), currency_id: 'MXN' }],
    external_reference: p.pedido_id,
    notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mp-webhook?empresa=${p.empresa_id}`,
    back_urls: { success: portal, pending: portal, failure: portal },
    // Mercado Pago solo regresa solo al sitio con auto_return si la URL es https (en producción).
    ...(portal.startsWith('https://') ? { auto_return: 'approved' } : {}),
    statement_descriptor: p.empresa.slice(0, 22),
  }

  let creada: { id?: string; init_point?: string }
  try {
    const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secreto.mp_access_token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify(preferencia),
    })
    if (r.status === 401) return json({ error: 'Mercado Pago rechazó el token guardado. Vuelve a conectar la cuenta en Ajustes.' }, 400)
    if (!r.ok) return json({ error: 'Mercado Pago no pudo crear el link. Intenta de nuevo.' }, 502)
    creada = await r.json()
  } catch {
    return json({ error: 'No pudimos comunicarnos con Mercado Pago. Intenta en unos minutos.' }, 502)
  }
  if (!creada.id || !creada.init_point) return json({ error: 'Mercado Pago no devolvió el link.' }, 502)

  const { error: errRegistro } = await servicio.rpc('registrar_link_pago', {
    p_pedido: p.pedido_id,
    p_monto: p.monto,
    p_url: creada.init_point,
    p_externo: creada.id,
    p_concepto: p.concepto,
    p_usuario: sesion.usuario.id,
  })
  if (errRegistro) return json({ error: errRegistro.message }, 400)
  return json({ url: creada.init_point, monto: p.monto, concepto: p.concepto })
})
