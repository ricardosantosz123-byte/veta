import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from '@/app/layout/app-layout'
import { modulos } from '@/app/modulos'
import { PaginaModulo, PaginaNoEncontrada } from '@/app/paginas'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/tablero" replace /> },
      ...modulos.map((m) => ({ path: m.ruta.slice(1), element: <PaginaModulo modulo={m} /> })),
    ],
  },
  // Portal público (Fase 7): /:slug/p/:token y /:slug/seguimiento, fuera del layout.
  { path: '*', element: <PaginaNoEncontrada /> },
])
