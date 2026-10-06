import { createBrowserRouter } from 'react-router'
import { Inicio, RequiereEmpresa, RequierePermiso, RequiereSesion } from '@/app/guardias'
import { AppLayout } from '@/app/layout/app-layout'
import { modulos } from '@/app/modulos'
import { PaginaModulo, PaginaNoEncontrada } from '@/app/paginas'
import { PaginaCatalogo } from '@/app/paginas-lazy'
import { PaginaAjustes } from '@/features/ajustes/components/pagina-ajustes'
import {
  PaginaEntrar,
  PaginaRecuperar,
  PaginaRegistro,
  PaginaRestablecer,
} from '@/features/auth/components/paginas-auth'
import { AsistenteAlta } from '@/features/empresa/components/asistente-alta'

// Páginas propias por módulo; los demás muestran su estado vacío hasta su fase.
const paginas: Record<string, React.ReactNode> = {
  '/ajustes': <PaginaAjustes />,
  '/catalogo': <PaginaCatalogo />,
}
// Módulos con subrutas propias (/catalogo/modelos/:id…).
const conSubrutas = new Set(['/catalogo'])

export const router = createBrowserRouter([
  { path: '/entrar', element: <PaginaEntrar /> },
  { path: '/registro', element: <PaginaRegistro /> },
  { path: '/recuperar', element: <PaginaRecuperar /> },
  { path: '/restablecer', element: <PaginaRestablecer /> },
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
  // Portal público (Fase 7): /:slug/p/:token y /:slug/seguimiento, fuera del layout y sin sesión.
  { path: '*', element: <PaginaNoEncontrada /> },
])
