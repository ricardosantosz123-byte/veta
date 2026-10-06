// Utilidades de correo compartidas por `notificar` (con sesión) y `avisos` (eventos del sistema).
// Sin RESEND_API_KEY / EMAIL_FROM, enviarResend responde 'no_configurado' y no falla.

export function escapar(t: string) {
  return t.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!)
}

export const moneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
export function fechaLarga(d: string) {
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${d}T00:00:00Z`))
}

export function base64(bytes: Uint8Array) {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

export function plantilla(o: { empresa: string; color: string; titulo: string; cuerpo: string; pie: string }) {
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

export async function enviarResend(para: string, asunto: string, html: string, adjuntos: { filename: string; content: string }[] = []) {
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
