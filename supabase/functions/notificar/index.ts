// Edge Function `notificar`: correos transaccionales con Resend (PRD §5.9).
//
// Tipos implementados:
//   · cotizacion_enviada  { cotizacion_id, pdf_path } → correo al cliente con el PDF adjunto.
//   · pago_recibido       { pago_id, pdf_path }       → correo al cliente con el recibo adjunto.
//
// Todo se lee con la sesión de quien llama: RLS decide si puede ver la cotización y descargar el PDF.
// Sin RESEND_API_KEY / EMAIL_FROM responde { correo: 'no_configurado' } y la app ofrece WhatsApp.
// (Los avisos automáticos por Database Webhooks llegan en la Fase 10.)
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'
import { base64, enviarResend, escapar, fechaLarga, moneda, plantilla } from '../_shared/correo.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function cotizacionEnviada(db: SupabaseClient, cuerpo: Record<string, unknown>) {
  const cotizacionId = cuerpo.cotizacion_id
  const pdfPath = cuerpo.pdf_path
  if (typeof cotizacionId !== 'string' || !UUID.test(cotizacionId)) return json({ error: 'Cotización inválida.' }, 400)
  if (typeof pdfPath !== 'string') return json({ error: 'Falta el PDF.' }, 400)

  const { data: c } = await db
    .from('cotizaciones')
    .select('id, empresa_id, folio, estado, total, vigencia_hasta, precios_con_iva, cliente:clientes(nombre, email), empresa:empresas(nombre, color_marca, email)')
    .eq('id', cotizacionId)
    .maybeSingle()
  if (!c) return json({ error: 'No tienes acceso a esa cotización.' }, 403)
  const cliente = c.cliente as unknown as { nombre: string; email: string | null } | null
  const empresa = c.empresa as unknown as { nombre: string; color_marca: string; email: string | null }
  if (!cliente?.email) return json({ error: 'El cliente no tiene correo. Agrégalo en su ficha.' }, 400)

  // El PDF debe ser de esta cotización: privado/{empresa}/cotizaciones/{cotización}/…
  if (!pdfPath.startsWith(`${c.empresa_id}/cotizaciones/${c.id}/`) || pdfPath.includes('..')) {
    return json({ error: 'PDF inválido.' }, 400)
  }
  const { data: archivo, error: errPdf } = await db.storage.from('privado').download(pdfPath)
  if (errPdf || !archivo) return json({ error: 'No se encontró el PDF.' }, 404)

  const total = moneda.format(Number(c.total)) + (c.precios_con_iva ? ' (IVA incluido)' : '')
  const html = plantilla({
    empresa: empresa.nombre,
    color: empresa.color_marca,
    titulo: `Tu cotización C-${c.folio}`,
    cuerpo: `<p style="margin:0 0 12px;font-size:15px;line-height:1.5">Hola ${escapar(cliente.nombre)}, te enviamos la cotización que solicitaste. La encuentras adjunta en PDF.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:15px;line-height:1.6">
<tr><td style="color:#6e6e73;padding-right:16px">Total</td><td style="font-weight:600">${escapar(total)}</td></tr>
${c.vigencia_hasta ? `<tr><td style="color:#6e6e73;padding-right:16px">Válida hasta</td><td>${fechaLarga(c.vigencia_hasta)}</td></tr>` : ''}
</table>`,
    pie: `Si tienes dudas, responde a este correo${empresa.email ? ` o escribe a ${escapar(empresa.email)}` : ''}.`,
  })

  const correo = await enviarResend(cliente.email, `Cotización C-${c.folio} · ${empresa.nombre}`, html, [
    { filename: `Cotizacion-C-${c.folio}.pdf`, content: base64(new Uint8Array(await archivo.arrayBuffer())) },
  ])
  if (correo === 'enviado' && c.estado === 'borrador') {
    await db.from('cotizaciones').update({ estado: 'enviada' }).eq('id', c.id)
  }
  return json({ correo })
}

const METODO: Record<string, string> = {
  efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta', mercado_pago: 'Mercado Pago', otro: 'Otro',
}

async function pagoRecibido(db: SupabaseClient, cuerpo: Record<string, unknown>) {
  const pagoId = cuerpo.pago_id
  const pdfPath = cuerpo.pdf_path
  if (typeof pagoId !== 'string' || !UUID.test(pagoId)) return json({ error: 'Pago inválido.' }, 400)
  if (typeof pdfPath !== 'string') return json({ error: 'Falta el recibo.' }, 400)

  // v_pagos trae el saldo después de este pago, calculado por la base.
  const { data: g } = await db
    .from('v_pagos')
    .select('id, empresa_id, pedido_id, folio, fecha, monto, metodo, anulado, saldo_despues, pedido_folio')
    .eq('id', pagoId)
    .maybeSingle()
  if (!g) return json({ error: 'No tienes acceso a ese pago.' }, 403)
  if (g.anulado) return json({ error: 'Ese pago está anulado.' }, 400)
  const { data: p } = await db
    .from('pedidos')
    .select('cliente:clientes(nombre, email), empresa:empresas(nombre, color_marca, email)')
    .eq('id', g.pedido_id)
    .single()
  const cliente = p?.cliente as unknown as { nombre: string; email: string | null } | null
  const empresa = p?.empresa as unknown as { nombre: string; color_marca: string; email: string | null }
  if (!cliente?.email) return json({ error: 'El cliente no tiene correo. Agrégalo en su ficha.' }, 400)

  if (!pdfPath.startsWith(`${g.empresa_id}/recibos/${g.pedido_id}/`) || pdfPath.includes('..')) {
    return json({ error: 'Recibo inválido.' }, 400)
  }
  const { data: archivo, error: errPdf } = await db.storage.from('privado').download(pdfPath)
  if (errPdf || !archivo) return json({ error: 'No se encontró el recibo.' }, 404)

  const saldo = Number(g.saldo_despues)
  const lineaSaldo = saldo > 0 ? `Saldo pendiente: <strong>${moneda.format(saldo)}</strong>` : saldo < 0 ? `Saldo a favor: <strong>${moneda.format(-saldo)}</strong>` : 'Tu pedido quedó liquidado.'
  const html = plantilla({
    empresa: empresa.nombre,
    color: empresa.color_marca,
    titulo: `Recibimos tu pago`,
    cuerpo: `<p style="margin:0 0 12px;font-size:15px;line-height:1.5">Hola ${escapar(cliente.nombre)}, gracias por tu pago para el pedido P-${g.pedido_folio}. Adjuntamos el recibo R-${g.folio}.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:15px;line-height:1.6">
<tr><td style="color:#6e6e73;padding-right:16px">Monto</td><td style="font-weight:600">${escapar(moneda.format(Number(g.monto)))}</td></tr>
<tr><td style="color:#6e6e73;padding-right:16px">Fecha</td><td>${fechaLarga(g.fecha)}</td></tr>
<tr><td style="color:#6e6e73;padding-right:16px">Forma de pago</td><td>${escapar(METODO[g.metodo] ?? g.metodo)}</td></tr>
</table>
<p style="margin:16px 0 0;font-size:15px">${lineaSaldo}</p>`,
    pie: `Si tienes dudas, responde a este correo${empresa.email ? ` o escribe a ${escapar(empresa.email)}` : ''}.`,
  })
  const correo = await enviarResend(cliente.email, `Recibo R-${g.folio} · ${empresa.nombre}`, html, [
    { filename: `Recibo-R-${g.folio}.pdf`, content: base64(new Uint8Array(await archivo.arrayBuffer())) },
  ])
  return json({ correo })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  const authorization = req.headers.get('Authorization')
  if (!authorization) return json({ error: 'Inicia sesión primero.' }, 401)
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
  const { data: auth } = await db.auth.getUser()
  if (!auth.user) return json({ error: 'Tu sesión expiró. Vuelve a entrar.' }, 401)

  let cuerpo: Record<string, unknown>
  try {
    cuerpo = await req.json()
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400)
  }

  switch (cuerpo.tipo) {
    case 'cotizacion_enviada':
      return cotizacionEnviada(db, cuerpo)
    case 'pago_recibido':
      return pagoRecibido(db, cuerpo)
    default:
      return json({ error: 'Tipo de aviso desconocido.' }, 400)
  }
})
