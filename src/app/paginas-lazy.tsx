import { lazy, Suspense, type ReactNode } from 'react'

// Módulos grandes: se descargan hasta que se visitan.
const Catalogo = lazy(() => import('@/features/catalogo/components/pagina-catalogo'))
const Clientes = lazy(() => import('@/features/clientes/components/pagina-clientes'))
const Cotizaciones = lazy(() => import('@/features/cotizaciones/components/pagina-cotizaciones'))
const Pedidos = lazy(() => import('@/features/pedidos/components/pagina-pedidos'))
const Produccion = lazy(() => import('@/features/produccion/components/pagina-produccion'))
const MisOrdenes = lazy(() => import('@/features/produccion/components/mis-ordenes'))
const Insumos = lazy(() => import('@/features/insumos/components/pagina-insumos'))

function Cargando() {
  return <div className="mx-auto h-64 w-full max-w-5xl animate-pulse rounded-xl bg-muted" aria-busy="true" aria-label="Cargando" />
}

function Diferido({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Cargando />}>{children}</Suspense>
}

export const PaginaCatalogo = () => (
  <Diferido>
    <Catalogo />
  </Diferido>
)
export const PaginaClientes = () => (
  <Diferido>
    <Clientes />
  </Diferido>
)
export const PaginaCotizaciones = () => (
  <Diferido>
    <Cotizaciones />
  </Diferido>
)
export const PaginaPedidos = () => (
  <Diferido>
    <Pedidos />
  </Diferido>
)
export const PaginaProduccion = () => (
  <Diferido>
    <Produccion />
  </Diferido>
)
export const PaginaMisOrdenes = () => (
  <Diferido>
    <MisOrdenes />
  </Diferido>
)
export const PaginaInsumos = () => (
  <Diferido>
    <Insumos />
  </Diferido>
)
