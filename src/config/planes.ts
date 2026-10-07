// Planes de Veta (decisión de Ricardo, 2026-10-06). Montos en pesos con IVA incluido; anual = 10 meses.
// El cobro real usa los precios de Stripe (STRIPE_PRICE_<PLAN>_<MENSUAL|ANUAL>): si cambias un monto
// aquí, cámbialo también en Stripe. Los límites de usuarios los impone la base (uso_plan).
export type PlanId = 'taller' | 'muebleria' | 'despacho'

export interface Plan {
  id: PlanId
  nombre: string
  para: string
  mensual: number
  anual: number
  /** Despacho se vende cuando exista el módulo de Proyectos. */
  disponible: boolean
}

const lista: Plan[] = [
  { id: 'taller', nombre: 'Taller', para: 'Para talleres que fabrican sobre pedido.', mensual: 300, anual: 3000, disponible: true },
  { id: 'muebleria', nombre: 'Mueblería', para: 'Para mueblerías que venden y mandan a fabricar.', mensual: 500, anual: 5000, disponible: true },
  { id: 'despacho', nombre: 'Despacho de Interiores', para: 'Para despachos que llevan proyectos con varios pedidos.', mensual: 500, anual: 5000, disponible: false },
]

export const planes = {
  diasPrueba: 14,
  lista,
  incluidos: { oficina: 3, proveedores: 5 },
  extra: { mensual: 100, anual: 1000 },
  incluye: [
    '3 usuarios de oficina: Vendedor, Comprador o Producción',
    '5 proveedores con acceso desde su celular',
    'Admin y Contador sin costo',
    'Cotizador con tus listas de precios y PDF con tu logo',
    'Pedidos, anticipos, saldos y recibos',
    'Producción por etapa con tus proveedores',
    'Portal de seguimiento para tus clientes',
    'Cobro con link de Mercado Pago a tu propia cuenta',
    'Insumos con existencias y alertas',
  ],
} as const

export function buscarPlan(id: string | null | undefined): Plan | undefined {
  return lista.find((p) => p.id === id)
}
