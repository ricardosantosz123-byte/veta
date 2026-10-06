// Formato de montos y fechas para la interfaz (es-MX, MXN, America/Mexico_City).
// Solo presenta valores: los montos se calculan en la base de datos, nunca aquí.

const ZONA = 'America/Mexico_City'

const fmtMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const fmtNumero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 })
const fmtPorcentaje = new Intl.NumberFormat('es-MX', { style: 'percent', maximumFractionDigits: 1 })

type Monto = number | string | null | undefined

function aNumero(valor: Monto): number | null {
  if (valor === null || valor === undefined || valor === '') return null
  const n = typeof valor === 'number' ? valor : Number(valor)
  return Number.isFinite(n) ? n : null
}

/** $12,345.60 · acepta number o string (numeric de Postgres). Vacío → "—". */
export function moneda(valor: Monto): string {
  const n = aNumero(valor)
  return n === null ? '—' : fmtMoneda.format(n)
}

/** 1,234.5 */
export function numero(valor: Monto): string {
  const n = aNumero(valor)
  return n === null ? '—' : fmtNumero.format(n)
}

/** Recibe la fracción tal como la guarda la base (0.16 → "16%"). */
export function porcentaje(fraccion: Monto): string {
  const n = aNumero(fraccion)
  return n === null ? '—' : fmtPorcentaje.format(n)
}

// Una columna `date` llega como "2026-10-05": se interpreta como día de calendario, sin zona,
// para que no se recorra al día anterior al convertir de UTC a la Ciudad de México.
const SOLO_FECHA = /^\d{4}-\d{2}-\d{2}$/

function partes(valor: string | Date, conHora: boolean): Intl.DateTimeFormatPart[] | null {
  const soloFecha = typeof valor === 'string' && SOLO_FECHA.test(valor)
  const d = soloFecha ? new Date(`${valor}T00:00:00Z`) : new Date(valor)
  if (Number.isNaN(d.getTime())) return null
  const opciones: Intl.DateTimeFormatOptions = {
    timeZone: soloFecha ? 'UTC' : ZONA,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(conHora && !soloFecha ? { hour: 'numeric', minute: '2-digit' } : {}),
  }
  return new Intl.DateTimeFormat('es-MX', opciones).formatToParts(d)
}

function armar(valor: string | Date | null | undefined, conHora: boolean): string {
  if (!valor) return '—'
  const p = partes(valor, conHora)
  if (!p) return '—'
  const tomar = (tipo: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === tipo)?.value ?? ''
  const mes = tomar('month').replace('.', '')
  const base = `${tomar('day')} ${mes} ${tomar('year')}`
  if (!conHora || !tomar('hour')) return base
  const periodo = tomar('dayPeriod')
  return `${base}, ${tomar('hour')}:${tomar('minute')}${periodo ? ` ${periodo}` : ''}`
}

/** 5 oct 2026 (formato d MMM yyyy, hora de la Ciudad de México). */
export function fecha(valor: string | Date | null | undefined): string {
  return armar(valor, false)
}

/** 5 oct 2026, 4:30 p.m. */
export function fechaHora(valor: string | Date | null | undefined): string {
  return armar(valor, true)
}

/** "Hoy" en la Ciudad de México como "AAAA-MM-DD" (para fechas por defecto y comparaciones). */
export function hoyMx(): string {
  // en-CA da el formato ISO AAAA-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

/** Días de calendario entre hoy (Ciudad de México) y una fecha "AAAA-MM-DD". Negativo: ya pasó. */
export function diasDesdeHoy(fechaIso: string | null | undefined): number | null {
  if (!fechaIso || !SOLO_FECHA.test(fechaIso)) return null
  return Math.round((Date.parse(`${fechaIso}T00:00:00Z`) - Date.parse(`${hoyMx()}T00:00:00Z`)) / 86_400_000)
}
