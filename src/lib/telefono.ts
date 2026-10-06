/** "523311112222" → "33 1111 2222" para mostrar. Otros formatos se muestran tal cual. */
export function telefonoLegible(tel: string | null | undefined): string {
  if (!tel) return '—'
  const d = tel.replace(/\D/g, '')
  const local = d.length === 12 && d.startsWith('52') ? d.slice(2) : d.length === 10 ? d : null
  if (!local) return tel
  // CDMX, Guadalajara y Monterrey usan lada de 2 dígitos; el resto, de 3.
  return ['55', '56', '33', '81'].includes(local.slice(0, 2))
    ? `${local.slice(0, 2)} ${local.slice(2, 6)} ${local.slice(6)}`
    : `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`
}
