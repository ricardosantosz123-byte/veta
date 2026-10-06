// Enlaces wa.me prearmados (PRD §5.9). Sin API de WhatsApp Business en la V1.

/** Deja solo dígitos; a un número mexicano de 10 dígitos le antepone 52. */
export function normalizarTelefono(telefono: string | null | undefined): string | null {
  const digitos = (telefono ?? '').replace(/\D/g, '')
  if (digitos.length === 10) return `52${digitos}`
  return digitos.length >= 11 ? digitos : null
}

/** https://wa.me/<tel>?text=… · sin teléfono abre WhatsApp para elegir el contacto. */
export function enlaceWhatsApp(texto: string, telefono?: string | null): string {
  const tel = normalizarTelefono(telefono)
  return `https://wa.me/${tel ?? ''}?text=${encodeURIComponent(texto)}`
}
