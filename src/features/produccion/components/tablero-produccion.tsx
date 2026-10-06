import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Factory, GripVertical } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useEmpresaActiva, usePuede, usePuedeEditar } from '@/app/empresa-activa'
import { EstadoVacio } from '@/components/estado-vacio'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useEtapas } from '@/features/catalogo/hooks'
import { Semaforo } from '@/features/pedidos/components/semaforo'
import { avanzarOrden, leerOrdenes, type EstadoOrden, type Orden } from '@/features/produccion/api'
import { DialogoOrden } from '@/features/produccion/components/dialogo-orden'
import { mensajeError } from '@/lib/errores'
import { diasDesdeHoy, moneda } from '@/lib/formato'
import { cn } from '@/lib/utils'

const TODOS = '__todos__'
const SIN = '__sin__'
const COLUMNAS: { estado: EstadoOrden; titulo: string }[] = [
  { estado: 'pendiente', titulo: 'Pendiente' },
  { estado: 'en_proceso', titulo: 'En proceso' },
  { estado: 'terminada', titulo: 'Terminada' },
]

/** Semáforo de una orden a partir de su fecha compromiso (hoy en la Ciudad de México). */
function semaforoOrden(o: Orden) {
  const d = diasDesdeHoy(o.fecha_compromiso)
  if (d === null || o.estado === 'terminada') return { semaforo: null, dias: null }
  return { semaforo: d < 0 ? 'atrasado' : d <= 3 ? 'por_vencer' : 'a_tiempo', dias: d }
}

function Tarjeta({ o, arrastrable, verCostos, onAbrir }: { o: Orden; arrastrable: boolean; verCostos: boolean; onAbrir: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({
    id: o.id,
    disabled: !arrastrable,
    data: { estado: o.estado },
  })
  const s = semaforoOrden(o)
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn('flex rounded-xl border bg-card shadow-xs', isDragging && 'z-10 opacity-80 shadow-md ring-2 ring-ring/40')}
    >
      {/* El agarradero mueve la tarjeta (mouse, dedo o teclado); el resto la abre. */}
      {arrastrable && (
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="flex w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-l-xl text-muted-foreground hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none active:cursor-grabbing"
          aria-label={`Mover la orden O-${o.folio} a otra columna`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
      )}
      <button
        type="button"
        onClick={onAbrir}
        className="grid min-w-0 flex-1 gap-1 rounded-xl p-3 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="tabular">
            O-{o.folio}
            {o.renglon?.pedido && ` · P-${o.renglon.pedido.folio}`}
          </span>
          {verCostos && <span className="tabular">{moneda(o.costo_acordado)}</span>}
        </span>
        <span className="text-sm font-medium">
          {o.cantidad} × {o.descripcion}
        </span>
        <span className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className={o.destajista ? '' : 'text-amber-700 dark:text-amber-400'}>{o.destajista?.nombre ?? 'Sin asignar'}</span>
          <Semaforo semaforo={s.semaforo} dias={s.dias} />
        </span>
      </button>
    </li>
  )
}

function Columna({ estado, titulo, children, total }: { estado: EstadoOrden; titulo: string; children: React.ReactNode; total: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: estado })
  return (
    <section ref={setNodeRef} aria-label={`${titulo}: ${total} órdenes`} className={cn('flex min-h-48 flex-col gap-2 rounded-2xl bg-muted/50 p-2 transition-colors', isOver && 'bg-muted ring-2 ring-ring/30')}>
      <h3 className="flex items-center justify-between px-2 pt-1 text-sm font-medium">
        {titulo}
        <span className="text-muted-foreground tabular">{total}</span>
      </h3>
      <ul className="grid gap-2">{children}</ul>
    </section>
  )
}

export function TableroProduccion() {
  const { empresa } = useEmpresaActiva()
  const queryClient = useQueryClient()
  const gestionar = usePuedeEditar('gestionar_produccion')
  const verCostos = usePuede('ver_costos')
  const etapas = useEtapas()
  const ordenes = useQuery({ queryKey: ['produccion', empresa!.id, 'ordenes'], queryFn: () => leerOrdenes(empresa!.id) })
  const [etapaElegida, setEtapaElegida] = useState<string | null>(null)
  const [destajista, setDestajista] = useState(TODOS)
  const [soloAtrasadas, setSoloAtrasadas] = useState(false)
  const [abiertaId, setAbiertaId] = useState<string | null>(null)

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  )

  const etapasConOrdenes = useMemo(() => {
    const ids = new Set(ordenes.data?.map((o) => o.etapa_id))
    return (etapas.data ?? []).filter((e) => e.activo || ids.has(e.id))
  }, [etapas.data, ordenes.data])
  const etapaId = etapaElegida ?? etapasConOrdenes.find((e) => ordenes.data?.some((o) => o.etapa_id === e.id && o.estado !== 'terminada'))?.id ?? etapasConOrdenes[0]?.id

  const destajistas = useMemo(() => {
    const m = new Map<string, string>()
    for (const o of ordenes.data ?? []) if (o.destajista_id && o.destajista) m.set(o.destajista_id, o.destajista.nombre)
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [ordenes.data])

  const visibles = (ordenes.data ?? []).filter(
    (o) =>
      o.etapa_id === etapaId &&
      (destajista === TODOS || (destajista === SIN ? !o.destajista_id : o.destajista_id === destajista)) &&
      (!soloAtrasadas || semaforoOrden(o).semaforo === 'atrasado'),
  )

  const mover = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: EstadoOrden }) => avanzarOrden(id, estado),
    // Movimiento optimista: la tarjeta cambia de columna al soltarla y vuelve si la base lo rechaza.
    onMutate: async ({ id, estado }) => {
      const clave = ['produccion', empresa!.id, 'ordenes']
      await queryClient.cancelQueries({ queryKey: clave })
      const antes = queryClient.getQueryData<Orden[]>(clave)
      queryClient.setQueryData<Orden[]>(clave, (d) => d?.map((o) => (o.id === id ? { ...o, estado } : o)))
      return { antes }
    },
    onError: (e, _, ctx) => {
      if (ctx?.antes) queryClient.setQueryData(['produccion', empresa!.id, 'ordenes'], ctx.antes)
      toast.error(mensajeError(e))
    },
    onSuccess: async (_, { id, estado }) => {
      const o = ordenes.data?.find((x) => x.id === id)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['produccion', empresa!.id] }),
        queryClient.invalidateQueries({ queryKey: ['pedidos', empresa!.id] }),
      ])
      if (estado === 'terminada' && o?.renglon?.pedido) {
        // ¿Era la última etapa? Si el pedido quedó terminado, se avisa para el finiquito.
        const resto = (queryClient.getQueryData<Orden[]>(['produccion', empresa!.id, 'ordenes']) ?? []).filter((x) => x.renglon?.pedido?.id === o.renglon!.pedido!.id)
        if (resto.length > 0 && resto.every((x) => x.estado === 'terminada')) {
          toast.success(`P-${o.renglon.pedido.folio}: producción terminada. Ventas puede avisar al cliente para el finiquito.`, { duration: 8000 })
        }
      }
    },
  })

  function alSoltar({ active, over }: DragEndEvent) {
    if (!over) return
    const estado = over.id as EstadoOrden
    if (active.data.current?.estado !== estado) mover.mutate({ id: String(active.id), estado })
  }

  if (ordenes.isPending || etapas.isPending) return <Skeleton className="h-96 rounded-xl" />
  if (ordenes.error) return <p className="text-sm text-destructive">{mensajeError(ordenes.error)}</p>
  if (ordenes.data.length === 0)
    return (
      <EstadoVacio icono={Factory} titulo="No hay órdenes de producción" descripcion="Ve a «Por programar» para mandar un pedido a producción: se crean las órdenes por etapa con su destajista y su pago." />
    )

  const abierta = ordenes.data.find((o) => o.id === abiertaId) ?? null

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <nav aria-label="Etapas" className="-mx-1 flex flex-1 gap-1 overflow-x-auto px-1">
          {etapasConOrdenes.map((e) => {
            const abiertas = ordenes.data.filter((o) => o.etapa_id === e.id && o.estado !== 'terminada').length
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => setEtapaElegida(e.id)}
                aria-pressed={e.id === etapaId}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm whitespace-nowrap outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  e.id === etapaId ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
              >
                {e.nombre}
                {abiertas > 0 && <span className="ml-1.5 tabular opacity-70">{abiertas}</span>}
              </button>
            )
          })}
        </nav>
        <Select value={destajista} onValueChange={setDestajista}>
          <SelectTrigger className="w-48" aria-label="Filtrar por destajista">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los destajistas</SelectItem>
            <SelectItem value={SIN}>Sin asignar</SelectItem>
            {destajistas.map(([id, nombre]) => (
              <SelectItem key={id} value={id}>
                {nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-primary" checked={soloAtrasadas} onChange={(e) => setSoloAtrasadas(e.target.checked)} />
          Solo atrasadas
        </label>
      </div>

      <DndContext
        sensors={sensores}
        onDragEnd={alSoltar}
        accessibility={{
          screenReaderInstructions: { draggable: 'Para mover una orden de columna, presiona espacio, usa las flechas y presiona espacio para soltarla.' },
          announcements: {
            onDragStart: () => 'Tomaste la orden.',
            onDragOver: ({ over }) => (over ? `Sobre la columna ${COLUMNAS.find((c) => c.estado === over.id)?.titulo}.` : 'Fuera de las columnas.'),
            onDragEnd: ({ over }) => (over ? `Orden movida a ${COLUMNAS.find((c) => c.estado === over.id)?.titulo}.` : 'Movimiento cancelado.'),
            onDragCancel: () => 'Movimiento cancelado.',
          },
        }}
      >
        <div className="grid gap-3 md:grid-cols-3">
          {COLUMNAS.map((c) => {
            const lista = visibles.filter((o) => o.estado === c.estado)
            return (
              <Columna key={c.estado} estado={c.estado} titulo={c.titulo} total={lista.length}>
                {lista.length === 0 && <li className="px-2 py-6 text-center text-xs text-muted-foreground">Sin órdenes</li>}
                {lista.map((o) => (
                  <Tarjeta key={o.id} o={o} arrastrable={gestionar} verCostos={verCostos} onAbrir={() => setAbiertaId(o.id)} />
                ))}
              </Columna>
            )
          })}
        </div>
      </DndContext>

      <DialogoOrden orden={abierta} onCerrar={() => setAbiertaId(null)} />
    </div>
  )
}
