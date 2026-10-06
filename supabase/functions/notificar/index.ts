// Edge Function `notificar`: correos transaccionales con Resend (PRD §5.9).
//
// Tipos implementados:
//   · cotizacion_enviada  { cotizacion_id, pdf_path } → correo al cliente con el PDF adjunto.
//
// Todo se lee con la sesión de quien llama: RLS decide si puede ver la cotización y descargar el PDF.
// Sin RESEND_API_KEY / EMAIL_FROM responde { correo: 'no_configurado' } y la app ofrece WhatsApp.
// (Los avisos automáticos por Database Webhooks llegan en la Fase 10.)
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function escapar(t: string) {
  return t.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!)
}

const moneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
function fechaLarga(d: string) {
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${d}T00:00:00Z`))
}

function base64(bytes: Uint8Array) {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

function plantilla(o: { empresa: string; color: string; titulo: string; cuerpo: string; pie: string }) {
  const color = /^#[0-9a-f]{6}$/i.test(o.color) ? o.color : '#1d1d1f'
  return `<!doctype html><html lang="es-MX"><body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1d1d1f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:12px;border:1px solid #e5e5e5;overflow:hidden">
<tr><td style="height:4px;background:${color}"></td></tr>
<tr><td style="padding:32px">
<p style="margin:0 0 8px;font-size:14px;color:#6e6e73">${escapar(o.empresa)}</p>
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">${o.titulo}</h1>
${o.cuerpo}
<p style="margin:24px 0 0;font-size:13px;color:#6e6e73;line-height:1.5">${o.pie}</p>
</td></tr></table></td></tr></table></body></html>`
}

async function enviarResend(para: string, asunto: string, html: string, adjuntos: { filename: string; content: string }[] = []) {
  const key = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('EMAIL_FROM')
  if (!key || !from) return 'no_configurado' as const
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [para], subject: asunto, html, attachments: adjuntos }),
  })
  if (!r.ok) {
    console.error('notificar: Resend', r.status, await r.text())
    return 'error' as const
  }
  return 'enviado' as const
}

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
    default:
      return json({ error: 'Tipo de aviso desconocido.' }, 400)
  }
})
