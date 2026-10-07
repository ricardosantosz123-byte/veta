// El portal público solo habla con la Edge Function `portal` (CLAUDE.md, regla 9): nunca con tablas.
// Se usa fetch directo, sin la sesión de quien navega, con la llave pública.
import type { Enum } from '@/lib/supabase'

const URL_FUNCION = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portal`
const LLAVE = import.meta.env.VITE_SUPABASE_ANON_KEY

export interface PortalPedido {
  token: string
  empresa: { nombre: string; slug: string; logo_path: string | null; telefono: string | null; color: string | null }
  pedido: {
    folio: number
    fecha: string
    estado: Enum<'estado_pedido'>
    fecha_compromiso: string | null
    cliente: string | null
    total: number
    pagado: number
    saldo: number
    anticipo_requerido: number
    anticipo_faltante: number
    en_produccion_at: string | null
    terminado_at: string | null
    liquidado_at: string | null
    entregado_at: string | null
    /** Fecha (CDMX) hasta la que el link sigue abierto: 90 días después de la entrega. */
    disponible_hasta: string | null
  }
  items: {
    descripcion: string
    opciones: string | null
    cantidad: number
    estado: Enum<'estado_produccion'>
    etapas: { etapa: string; estado: Enum<'estado_orden'> }[]
  }[]
  pagos: { fecha: string; monto: number; metodo: Enum<'metodo_pago'> }[]
  link_pago: string | null
}

/** Pasados 90 días de la entrega, la base ya no devuelve el pedido: solo el contacto de la mueblería. */
export interface PortalCerrado {
  token: string
  cerrado: true
  empresa: PortalPedido['empresa']
}

export type PortalRespuesta = PortalPedido | PortalCerrado

type TipoError = 'no_encontrado' | 'demasiados_intentos' | 'error'

export class ErrorPortal extends Error {
  readonly tipo: TipoError
  constructor(tipo: TipoError) {
    super(
      tipo === 'no_encontrado'
        ? 'No encontramos ese pedido.'
        : tipo === 'demasiados_intentos'
          ? 'Hiciste muchos intentos seguidos. Espera 10 minutos y vuelve a intentar.'
          : 'No pudimos cargar tu pedido. Revisa tu conexión e intenta de nuevo.',
    )
    this.tipo = tipo
  }
}

async function llamar(init: RequestInit & { query?: Record<string, string> }): Promise<PortalRespuesta> {
  const url = init.query ? `${URL_FUNCION}?${new URLSearchParams(init.query)}` : URL_FUNCION
  let r: Response
  try {
    r = await fetch(url, { ...init, headers: { apikey: LLAVE, 'Content-Type': 'application/json' } })
  } catch {
    throw new ErrorPortal('error')
  }
  if (r.status === 404) throw new ErrorPortal('no_encontrado')
  if (r.status === 429) throw new ErrorPortal('demasiados_intentos')
  if (!r.ok) throw new ErrorPortal('error')
  return r.json()
}

export function leerPedidoPortal(slug: string, token: string) {
  return llamar({ method: 'GET', query: { slug, token } })
}

export function buscarPedidoPortal(slug: string, folio: string, apellidos: string) {
  return llamar({ method: 'POST', body: JSON.stringify({ slug, folio, apellidos }) })
}

export function urlLogo(ruta: string | null) {
  return ruta ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/publico/${ruta}` : null
}
