// Edge Function `avisos`: correos de eventos del sistema (PRD §5.9). No la llama el navegador.
//
// La llaman la base (pg_net, desde triggers) y pg_cron, con la cabecera x-avisos-secreto = AVISOS_SECRET:
//   · { tipo: 'pedido_terminado', pedido_id }  → al cliente: "tus muebles están listos" + saldo + link al portal.
//   · { tipo: 'pago_mercado_pago', pago_id }   → al cliente: "recibimos tu pago" (los manuales salen con
//                                                 recibo PDF desde la app, vía `notificar`).
//   · { tipo: 'prueba_por_vencer' }            → a los Admin de cada empresa cuya prueba vence en 3 días o hoy.
// Sin RESEND_API_KEY / EMAIL_FROM responde { correo: 'no_configurado' } y no hace nada más.
//
// Secretos: AVISOS_SECRET, APP_URL; RESEND_API_KEY y EMAIL_FROM opcionales. Se despliega con --no-verify-jwt.
import { enviarResend, escapar, fechaLarga, moneda, plantilla } from '../_shared/correo.ts'
import { clienteServicio, UUID } from '../_shared/sesion.ts'

const responder = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } })

function igualSeguro(a: string, b: string) {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

const boton = (url: string, texto: string, color: string) =>
  `<p style="margin:24px 0 0"><a href="${escapar(url)}" style="display:inline-block;background:#1d1d1f;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:15px;font-weight:600;border-top:3px solid ${/^#[0-9a-f]{6}$/i.test(color) ? color : '#1d1d1f'}">${escapar(texto)}</a></p>`

const hoyMx = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

Deno.serve(async (req) => {
  if (req.method !== 'POST') return responder({ error: 'metodo_no_permitido' }, 405)
  const secreto = Deno.env.get('AVISOS_SECRET')
  const recibido = req.headers.get('x-avisos-secreto') ?? ''
  if (!secreto || !igualSeguro(recibido, secreto)) return responder({ error: 'no_autorizado' }, 401)
  const appUrl = Deno.env.get('APP_URL')?.replace(/\/$/, '')
  if (!appUrl) return responder({ error: 'falta APP_URL' }, 500)
  if (!Deno.env.get('RESEND_API_KEY') || !Deno.env.get('EMAIL_FROM')) return responder({ correo: 'no_configurado' })

  let cuerpo: Record<string, unknown>
  try {
    cuerpo = await req.json()
  } catch {
    return responder({ error: 'solicitud_invalida' }, 400)
  }
  const db = clienteServicio()

  if (cuerpo.tipo === 'pedido_terminado' || cuerpo.tipo === 'pago_mercado_pago') {
    let pedidoId = String(cuerpo.pedido_id ?? '')
    let pago: { folio: number; monto: number; fecha: string } | null = null
    if (cuerpo.tipo === 'pago_mercado_pago') {
      const pagoId = String(cuerpo.pago_id ?? '')
      if (!UUID.test(pagoId)) return responder({ error: 'pago_invalido' }, 400)
      const { data } = await db.from('pagos_cliente').select('pedido_id, folio, monto, fecha, anulado').eq('id', pagoId).maybeSingle()
      if (!data || data.anulado) return responder({ correo: 'omitido' })
      pedidoId = data.pedido_id
      pago = { folio: data.folio, monto: Number(data.monto), fecha: data.fecha }
    }
    if (!UUID.test(pedidoId)) return responder({ error: 'pedido_invalido' }, 400)
    const { data: p } = await db
      .from('pedidos')
      .select('folio, saldo, estado, token_portal, cliente:clientes(nombre, email), empresa:empresas(nombre, slug, color_marca, email)')
      .eq('id', pedidoId)
      .maybeSingle()
    if (!p || p.estado === 'cancelado') return responder({ correo: 'omitido' })
    const cliente = p.cliente as unknown as { nombre: string; email: string | null }
    const empresa = p.empresa as unknown as { nombre: string; slug: string; color_marca: string; email: string | null }
    if (!cliente?.email) return responder({ correo: 'sin_correo' })
    const portal = `${appUrl}/${empresa.slug}/p/${p.token_portal}`
    const saldo = Number(p.saldo)
    const pie = `Si tienes dudas, responde a este correo${empresa.email ? ` o escribe a ${escapar(empresa.email)}` : ''}.`

    const html =
      cuerpo.tipo === 'pedido_terminado'
        ? plantilla({
            empresa: empresa.nombre,
            color: empresa.color_marca,
            titulo: '¡Tus muebles están listos!',
            cuerpo: `<p style="margin:0 0 12px;font-size:15px;line-height:1.5">Hola ${escapar(cliente.nombre)}, terminamos la fabricación de tu pedido P-${p.folio}.</p>
<p style="margin:0;font-size:15px;line-height:1.5">${saldo > 0 ? `Para coordinar la entrega falta liquidar <strong>${moneda.format(saldo)}</strong>.` : 'Tu pedido está liquidado: coordinemos la entrega.'}</p>
${boton(portal, 'Ver mi pedido', empresa.color_marca)}`,
            pie,
          })
        : plantilla({
            empresa: empresa.nombre,
            color: empresa.color_marca,
            titulo: 'Recibimos tu pago',
            cuerpo: `<p style="margin:0 0 12px;font-size:15px;line-height:1.5">Hola ${escapar(cliente.nombre)}, recibimos tu pago con Mercado Pago para el pedido P-${p.folio} (recibo R-${pago!.folio}).</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:15px;line-height:1.6">
<tr><td style="color:#6e6e73;padding-right:16px">Monto</td><td style="font-weight:600">${escapar(moneda.format(pago!.monto))}</td></tr>
<tr><td style="color:#6e6e73;padding-right:16px">Fecha</td><td>${fechaLarga(pago!.fecha)}</td></tr>
</table>
<p style="margin:16px 0 0;font-size:15px">${saldo > 0 ? `Saldo pendiente: <strong>${moneda.format(saldo)}</strong>` : 'Tu pedido quedó liquidado.'}</p>
${boton(portal, 'Ver mi pedido', empresa.color_marca)}`,
            pie,
          })
    const asunto = cuerpo.tipo === 'pedido_terminado' ? `Tu pedido P-${p.folio} está listo · ${empresa.nombre}` : `Recibimos tu pago · Pedido P-${p.folio}`
    return responder({ correo: await enviarResend(cliente.email, asunto, html) })
  }

  if (cuerpo.tipo === 'prueba_por_vencer') {
    const hoy = hoyMx()
    const en3 = new Date(`${hoy}T12:00:00Z`)
    en3.setUTCDate(en3.getUTCDate() + 3)
    const objetivo = [hoy, en3.toISOString().slice(0, 10)]
    const { data: empresas } = await db.from('empresas').select('id, nombre, prueba_termina').eq('estado_suscripcion', 'prueba')
    let enviados = 0
    for (const e of empresas ?? []) {
      const vence = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(e.prueba_termina))
      if (!objetivo.includes(vence)) continue
      const ultimoDia = vence === hoy
      const { data: admins } = await db.from('miembros').select('user_id').eq('empresa_id', e.id).eq('rol', 'admin').eq('activo', true)
      for (const a of admins ?? []) {
        const { data: u } = await db.auth.admin.getUserById(a.user_id)
        if (!u?.user?.email) continue
        const html = plantilla({
          empresa: e.nombre,
          color: '#1d1d1f',
          titulo: ultimoDia ? 'Tu prueba termina hoy' : 'Tu prueba termina en 3 días',
          cuerpo: `<p style="margin:0 0 12px;font-size:15px;line-height:1.5">${ultimoDia ? 'Hoy es el último día' : `El ${fechaLarga(vence)} termina`} tu periodo de prueba. Después, la cuenta queda en solo lectura: tus datos se conservan, pero no podrás crear ni editar.</p>
${boton(`${appUrl}/suscripcion`, 'Elegir un plan', '#1d1d1f')}`,
          pie: 'Recibes este correo porque eres Admin de esta empresa.',
        })
        if ((await enviarResend(u.user.email, ultimoDia ? 'Tu prueba termina hoy' : 'Tu prueba termina en 3 días', html)) === 'enviado') enviados++
      }
    }
    return responder({ enviados })
  }

  return responder({ error: 'tipo_desconocido' }, 400)
})
