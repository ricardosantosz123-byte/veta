import { SearchX } from 'lucide-react'
import { Link } from 'react-router'
import type { Modulo } from '@/app/modulos'
import { EstadoVacio } from '@/components/estado-vacio'
import { Button } from '@/components/ui/button'

// Página provisional de cada módulo: se reemplaza por features/<modulo> en su fase.
export function PaginaModulo({ modulo }: { modulo: Modulo }) {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{modulo.nombre}</h1>
      <EstadoVacio
        icono={modulo.icono}
        titulo={modulo.vacio.titulo}
        descripcion={modulo.vacio.descripcion}
        accion={modulo.vacio.accion}
        accionDeshabilitada
      />
    </div>
  )
}

export function PaginaNoEncontrada() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <SearchX className="size-10 text-muted-foreground" aria-hidden />
      <h1 className="text-xl font-semibold">No encontramos esta página</h1>
      <p className="text-sm text-muted-foreground">Revisa la dirección o vuelve al inicio.</p>
      <Button asChild>
        <Link to="/">Ir al inicio</Link>
      </Button>
    </div>
  )
}
