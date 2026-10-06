import { lazy, Suspense, type ReactNode } from 'react'

// Módulos grandes: se descargan hasta que se visitan.
const Catalogo = lazy(() => import('@/features/catalogo/components/pagina-catalogo'))
const Clientes = lazy(() => import('@/features/clientes/components/pagina-clientes'))
const Cotizaciones = lazy(() => import('@/features/cotizaciones/components/pagina-cotizaciones'))
const Pedidos = lazy(() => import('@/features/pedidos/components/pagina-pedidos'))
const Produccion = lazy(() => import('@/features/produccion/components/pagina-produccion'))
const MisOrdenes = lazy(() => import('@/features/produccion/components/mis-ordenes'))
const Insumos = lazy(() => import('@/features/insumos/components/pagina-insumos'))
const PedidoPortal = lazy(() => import('@/features/portal/components/pagina-pedido-portal'))
const Seguimiento = lazy(() => import('@/features/portal/components/pagina-seguimiento'))
const Suscripcion = lazy(() => import('@/features/suscripcion/pagina-suscripcion'))
const Tablero = lazy(() => import('@/features/tablero/pagina-tablero'))
const Inicio = lazy(() => import('@/features/landing/pagina-inicio'))
const Privacidad = lazy(() => import('@/features/landing/paginas-legales'))
const Terminos = lazy(() => import('@/features/landing/paginas-legales').then((m) => ({ default: m.PaginaTerminos })))

// Fuera del módulo de cada fase: también se descargan hasta que se visitan (rendimiento de la carga inicial).
const Ajustes = lazy(() => import('@/features/ajustes/components/pagina-ajustes').then((m) => ({ default: m.PaginaAjustes })))
const Asistente = lazy(() => import('@/features/empresa/components/asistente-alta').then((m) => ({ default: m.AsistenteAlta })))
const Layout = lazy(() => import('@/app/layout/app-layout').then((m) => ({ default: m.AppLayout })))
const Entrar = lazy(() => import('@/features/auth/components/paginas-auth').then((m) => ({ default: m.PaginaEntrar })))
const Registro = lazy(() => import('@/features/auth/components/paginas-auth').then((m) => ({ default: m.PaginaRegistro })))
const Recuperar = lazy(() => import('@/features/auth/components/paginas-auth').then((m) => ({ default: m.PaginaRecuperar })))
const Restablecer = lazy(() => import('@/features/auth/components/paginas-auth').then((m) => ({ default: m.PaginaRestablecer })))

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
export const PaginaPedidoPortal = () => (
  <Diferido>
    <PedidoPortal />
  </Diferido>
)
export const PaginaSeguimiento = () => (
  <Diferido>
    <Seguimiento />
  </Diferido>
)
export const PaginaSuscripcion = () => (
  <Diferido>
    <Suscripcion />
  </Diferido>
)
export const PaginaTablero = () => (
  <Diferido>
    <Tablero />
  </Diferido>
)
export const PaginaInicioPublica = () => (
  <Diferido>
    <Inicio />
  </Diferido>
)
export const PaginaPrivacidad = () => (
  <Diferido>
    <Privacidad />
  </Diferido>
)
export const PaginaTerminos = () => (
  <Diferido>
    <Terminos />
  </Diferido>
)
export const PaginaAjustes = () => (
  <Diferido>
    <Ajustes />
  </Diferido>
)
export const AsistenteAlta = () => (
  <Diferido>
    <Asistente />
  </Diferido>
)
/** El layout completo (barra lateral) se descarga después de saber que hay sesión. */
export const AppLayout = () => (
  <Suspense fallback={<div className="min-h-svh" aria-busy="true" aria-label="Cargando" />}>
    <Layout />
  </Suspense>
)
export const PaginaEntrar = () => (
  <Diferido>
    <Entrar />
  </Diferido>
)
export const PaginaRegistro = () => (
  <Diferido>
    <Registro />
  </Diferido>
)
export const PaginaRecuperar = () => (
  <Diferido>
    <Recuperar />
  </Diferido>
)
export const PaginaRestablecer = () => (
  <Diferido>
    <Restablecer />
  </Diferido>
)
