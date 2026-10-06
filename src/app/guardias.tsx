import { Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useEmpresaActiva } from '@/app/empresa-activa'
import { modulosDe } from '@/app/modulos'
import { EstadoVacio } from '@/components/estado-vacio'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/auth-provider'
import { puede, type Capacidad } from '@/lib/permisos'

function PantallaCarga() {
  return (
    <div className="flex min-h-svh" aria-busy="true" aria-label="Cargando">
      <div className="hidden w-64 border-r p-4 md:block">
        <Skeleton className="mb-6 h-10" />
        <div className="grid gap-2">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </div>
      </div>
      <div className="flex-1">
        <div className="h-14 border-b" />
        <div className="p-8">
          <Skeleton className="mb-6 h-8 w-48" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

/** Exige sesión. Sin sesión → /entrar?siguiente=<ruta actual>. */
export function RequiereSesion() {
  const { user, cargando, recuperando } = useAuth()
  const { pathname, search } = useLocation()
  if (cargando) return <PantallaCarga />
  if (!user) return <Navigate to={`/entrar?siguiente=${encodeURIComponent(pathname + search)}`} replace />
  if (recuperando) return <Navigate to="/restablecer" replace />
  return <Outlet />
}

/** Exige al menos una empresa activa. Sin ninguna → asistente de alta. */
export function RequiereEmpresa() {
  const { membresias, cargando } = useEmpresaActiva()
  if (cargando) return <PantallaCarga />
  if (membresias.length === 0) return <Navigate to="/bienvenida" replace />
  return <Outlet />
}

/** "/" lleva al primer módulo que el rol puede ver (el Destajista, a sus órdenes). */
export function Inicio() {
  const { rol } = useEmpresaActiva()
  const primero = modulosDe(rol)[0]
  return <Navigate to={primero?.ruta ?? '/ajustes'} replace />
}

export function SinAcceso() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <EstadoVacio
        icono={Lock}
        titulo="No tienes acceso a esta sección"
        descripcion="Tu rol en esta empresa no incluye este módulo. Si lo necesitas, pídeselo al Admin."
      />
    </div>
  )
}

/** Muestra el contenido solo si el rol tiene la capacidad. Es interfaz: la seguridad real es RLS. */
export function RequierePermiso({ capacidad, children }: { capacidad: Capacidad; children: ReactNode }) {
  const { rol } = useEmpresaActiva()
  return puede(rol, capacidad) ? children : <SinAcceso />
}
