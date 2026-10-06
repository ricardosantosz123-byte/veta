import { createBrowserRouter } from 'react-router'
import { Inicio, RequiereEmpresa, RequierePermiso, RequiereSesion } from '@/app/guardias'
import { modulos } from '@/app/modulos'
import { PaginaModulo, PaginaNoEncontrada } from '@/app/paginas'
import {
  AppLayout,
  AsistenteAlta,
  PaginaAjustes,
  PaginaCatalogo,
  PaginaClientes,
  PaginaCotizaciones,
  PaginaEntrar,
  PaginaInsumos,
  PaginaMisOrdenes,
  PaginaPedidoPortal,
  PaginaPedidos,
  PaginaPrivacidad,
  PaginaProduccion,
  PaginaRecuperar,
  PaginaRegistro,
  PaginaRestablecer,
  PaginaSeguimiento,
  PaginaSuscripcion,
  PaginaTablero,
  PaginaTerminos,
} from '@/app/paginas-lazy'

// Páginas propias por módulo; los demás muestran su estado vacío hasta su fase.
const paginas: Record<string, React.ReactNode> = {
  '/ajustes': <PaginaAjustes />,
  '/catalogo': <PaginaCatalogo />,
  '/clientes': <PaginaClientes />,
  '/cotizaciones': <PaginaCotizaciones />,
  '/pedidos': <PaginaPedidos />,
  '/produccion': <PaginaProduccion />,
  '/mis-ordenes': <PaginaMisOrdenes />,
  '/insumos': <PaginaInsumos />,
  '/suscripcion': <PaginaSuscripcion />,
  '/tablero': <PaginaTablero />,
}
// Módulos con subrutas propias (/catalogo/modelos/:id…).
const conSubrutas = new Set(['/catalogo', '/clientes', '/cotizaciones', '/pedidos', '/produccion', '/insumos'])

export const router = createBrowserRouter([
  { path: '/entrar', element: <PaginaEntrar /> },
  { path: '/registro', element: <PaginaRegistro /> },
  { path: '/recuperar', element: <PaginaRecuperar /> },
  { path: '/restablecer', element: <PaginaRestablecer /> },
  { path: '/privacidad', element: <PaginaPrivacidad /> },
  { path: '/terminos', element: <PaginaTerminos /> },
  {
    element: <RequiereSesion />,
    children: [
      { path: '/bienvenida', element: <AsistenteAlta /> },
      {
        element: <RequiereEmpresa />,
        children: [
          {
            path: '/',
            element: <AppLayout />,
            children: [
              { index: true, element: <Inicio /> },
              ...modulos.map((m) => ({
                path: m.ruta.slice(1) + (conSubrutas.has(m.ruta) ? '/*' : ''),
                element: <RequierePermiso capacidad={m.permiso}>{paginas[m.ruta] ?? <PaginaModulo modulo={m} />}</RequierePermiso>,
              })),
            ],
          },
        ],
      },
    ],
  },
  // Portal público del cliente final: sin sesión y fuera del layout; solo habla con la Edge Function `portal`.
  // Las rutas fijas de arriba (/entrar, /pedidos…) tienen prioridad sobre estas con :slug.
  { path: '/:slug/p/:token', element: <PaginaPedidoPortal /> },
  { path: '/:slug/seguimiento', element: <PaginaSeguimiento /> },
  { path: '*', element: <PaginaNoEncontrada /> },
])
