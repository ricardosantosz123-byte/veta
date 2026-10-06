import { Package, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { usePuedeEditar } from '@/app/empresa-activa'
import { EstadoVacio } from '@/components/estado-vacio'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { MiniaturaModelo } from '@/features/catalogo/components/foto-modelo'
import { useCategorias, useModelos } from '@/features/catalogo/hooks'
import { normalizar } from '@/lib/texto'
import { cn } from '@/lib/utils'

const TODAS = '__todas__'
const SIN = '__sin__'

export function SeccionModelos() {
  const editar = usePuedeEditar('editar_catalogo')
  const navigate = useNavigate()
  const modelos = useModelos()
  const categorias = useCategorias()
  const [filtro, setFiltro] = useState(TODAS)
  const [busqueda, setBusqueda] = useState('')

  const visibles = useMemo(() => {
    const q = normalizar(busqueda.trim())
    return (modelos.data ?? []).filter(
      (m) =>
        (filtro === TODAS || (filtro === SIN ? !m.categoria_id : m.categoria_id === filtro)) &&
        (!q || normalizar(m.nombre).includes(q)),
    )
  }, [modelos.data, filtro, busqueda])

  if (modelos.isPending) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="aspect-[4/5] rounded-xl" />
        ))}
      </div>
    )
  }

  if (modelos.data?.length === 0) {
    return (
      <EstadoVacio
        icono={Package}
        titulo="Tu catálogo está vacío"
        descripcion={editar ? 'Crea tu primer modelo en 3 pasos: el mueble, sus opciones y su precio.' : 'El Admin aún no ha capturado modelos.'}
        accion={editar ? 'Crea tu primer modelo' : undefined}
        onAccion={() => navigate('/catalogo/modelos/nuevo')}
      />
    )
  }

  const nombreCategoria = (id: string | null) => categorias.data?.find((c) => c.id === id)?.nombre
  const hayCategorias = (categorias.data?.length ?? 0) > 0

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" placeholder="Buscar modelo" aria-label="Buscar modelo" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="pl-9" />
        </div>
        <span className="flex-1" />
        {editar && (
          <Button asChild>
            <Link to="/catalogo/modelos/nuevo">
              <Plus aria-hidden /> Nuevo modelo
            </Link>
          </Button>
        )}
      </div>

      {hayCategorias && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoría">
          {[{ id: TODAS, nombre: 'Todas' }, ...(categorias.data ?? []), { id: SIN, nombre: 'Sin categoría' }].map((c) => (
            <Button key={c.id} size="sm" variant={filtro === c.id ? 'default' : 'outline'} aria-pressed={filtro === c.id} onClick={() => setFiltro(c.id)} className="rounded-full">
              {c.nombre}
            </Button>
          ))}
        </div>
      )}

      {visibles.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No hay modelos con ese filtro.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visibles.map((m) => (
            <li key={m.id}>
              <Link
                to={`/catalogo/modelos/${m.id}`}
                className={cn(
                  'group grid gap-2 rounded-xl p-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  !m.activo && 'opacity-60',
                )}
              >
                <MiniaturaModelo ruta={m.foto_path} nombre={m.nombre} className="aspect-square w-full transition-transform group-hover:scale-[1.01]" />
                <div className="grid gap-0.5 px-1">
                  <span className="truncate font-medium">{m.nombre}</span>
                  <span className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                    {nombreCategoria(m.categoria_id) ?? 'Sin categoría'}
                    {m.sobre_diseno && <Badge variant="secondary">Sobre diseño</Badge>}
                    {!m.activo && <Badge variant="outline">Inactivo</Badge>}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
