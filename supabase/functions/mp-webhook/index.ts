// Edge Function `mp-webhook`: notificaciones de pago de Mercado Pago (pública, sin JWT).
//
// La notificación NO se cree: la firma pertenece a la app de cada mueblería, no a Veta. Solo se toma
// el id del pago y se consulta en la API de Mercado Pago con el token de la empresa indicada en la URL
// (?empresa=<id>). Si el pago está aprobado, es en MXN y su external_reference es un pedido de esa
// empresa, registrar_pago_mp lo registra (idempotente por externo_id) y marca el link como pagado.
//
// Respuestas: 200 cuando no hay nada que hacer (para que Mercado Pago no reintente) y 500 si algo
// temporal falló (Mercado Pago reintenta). Se despliega con --no-verify-jwt.
import { clienteServicio, UUID } from '../_shared/sesion.ts'

const ok = (detalle: string) => new Response(JSON.stringify({ ok: true, detalle }), { status: 200, headers: { 'Content-Type': 'application/json' } })
const reintentar = (detalle: string) => new Response(JSON.stringify({ ok: false, detalle }), { status: 500, headers: { 'Content-Type': 'application/json' } })

/** Id del pago en cualquiera de los formatos de notificación (webhook nuevo o IPN). */
async function idDePago(req: Request, url: URL): Promise<string | null> {
  const tipo = url.searchParams.get('type') ?? url.searchParams.get('topic')
  let id = url.searchParams.get('data.id') ?? url.searchParams.get('id')
  let tipoCuerpo: string | undefined
  if (req.method === 'POST') {
    try {
      const cuerpo = await req.json()
      tipoCuerpo = cuerpo?.type ?? cuerpo?.topic
      id = String(cuerpo?.data?.id ?? cuerpo?.id ?? id ?? '')
    } catch {
      // sin cuerpo JSON: se usan los parámetros de la URL
    }
  }
  const esPago = (tipoCuerpo ?? tipo ?? '').startsWith('payment')
  return esPago && id && /^\d{1,20}$/.test(id) ? id : null
}

/** Fecha de aprobación en la Ciudad de México (AAAA-MM-DD). */
function fechaMx(iso: string | undefined) {
  const d = iso ? new Date(iso) : new Date()
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') return ok('metodo ignorado')
  const url = new URL(req.url)
  const empresaId = url.searchParams.get('empresa') ?? ''
  if (!UUID.test(empresaId)) return ok('sin empresa')

  const pagoId = await idDePago(req, url)
  if (!pagoId) return ok('no es un pago')

  const servicio = clienteServicio()
  const { data: secreto, error: errSecreto } = await servicio
    .from('empresa_secretos')
    .select('mp_access_token')
    .eq('empresa_id', empresaId)
    .maybeSingle()
  if (errSecreto) return reintentar('base no disponible')
  if (!secreto?.mp_access_token) return ok('empresa sin Mercado Pago')

  let pago: { status?: string; currency_id?: string; transaction_amount?: number; external_reference?: string; date_approved?: string }
  try {
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${pagoId}`, {
      headers: { Authorization: `Bearer ${secreto.mp_access_token}` },
    })
    if (r.status === 404 || r.status === 401 || r.status === 403) return ok('pago no encontrado con esta cuenta')
    if (!r.ok) return reintentar('Mercado Pago no respondió')
    pago = await r.json()
  } catch {
    return reintentar('sin conexión con Mercado Pago')
  }

  if (pago.status !== 'approved') return ok(`pago ${pago.status ?? 'sin estado'}`)
  if (pago.currency_id !== 'MXN') return ok('moneda distinta de MXN')
  if (!pago.external_reference || !UUID.test(pago.external_reference)) return ok('sin pedido')
  if (!pago.transaction_amount || pago.transaction_amount <= 0) return ok('monto inválido')

  const { error } = await servicio.rpc('registrar_pago_mp', {
    p_empresa: empresaId,
    p_pedido: pago.external_reference,
    p_pago_externo: pagoId,
    p_monto: pago.transaction_amount,
    p_fecha: fechaMx(pago.date_approved),
  })
  if (error) {
    // Pedido de otra empresa o ya inexistente: no tiene caso reintentar.
    if (error.message.includes('no pertenece')) return ok('pedido ajeno')
    return reintentar('no se pudo registrar')
  }
  return ok('pago registrado')
})
