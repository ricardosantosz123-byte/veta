import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ClipboardList, Hammer } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useEmpresaActiva, useSoloLectura } from '@/app/empresa-activa'
import { EstadoVacio } from '@/components/estado-vacio'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { type MaterialEntregado } from '@/features/insumos/api'
import { ListaMaterial } from '@/features/insumos/components/material-entregado'
import { useMaterialEntregado } from '@/features/insumos/hooks'
import { Semaforo } from '@/features/pedidos/components/semaforo'
import { avanzarOrden, leerMisPagos, leerOrdenes, leerSaldosDestajo, type Orden } from '@/features/produccion/api'
import { mensajeError } from '@/lib/errores'
import { diasDesdeHoy, fecha, moneda } from '@/lib/formato'

type Accion = { orden: Orden; estado: 'en_proceso' | 'terminada' }

function TarjetaOrden({ o, material, onAccion, bloqueado }: { o: Orden; material: MaterialEntregado[]; onAccion: (a: Accion) => void; bloqueado: boolean }) {
  const d = diasDesdeHoy(o.fecha_compromiso)
  const semaforo = o.estado === 'terminada' || d === null ? null : d < 0 ? 'atrasado' : d <= 3 ? 'por_vencer' : 'a_tiempo'
  return (
    <li className="grid gap-3 rounded-2xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground tabular">
            O-{o.folio} · {o.etapa?.nombre}
          </p>
          <p className="text-lg leading-snug font-semibold">
            {o.cantidad} × {o.descripcion}
          </p>
        </div>
        <p className="text-right text-sm font-medium whitespace-nowrap tabular">{moneda(o.costo_acordado)}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>{o.fecha_compromiso ? `Entrega ${fecha(o.fecha_compromiso)}` : 'Sin fecha de entrega'}</span>
        <Semaforo semaforo={semaforo} dias={d} />
      </div>
      {material.length > 0 && (
        <div className="rounded-xl bg-muted/50 px-3 py-1">
          <p className="pt-1.5 text-xs font-medium text-muted-foreground">Material que recibiste</p>
          <ListaMaterial material={material} />
        </div>
      )}
      {o.estado === 'pendiente' && (
        <Button size="lg" className="h-14 text-base" disabled={bloqueado} onClick={() => onAccion({ orden: o, estado: 'en_proceso' })}>
          <Hammer aria-hidden /> Empecé
        </Button>
      )}
      {o.estado === 'en_proceso' && (
        <Button size="lg" className="h-14 text-base" disabled={bloqueado} onClick={() => onAccion({ orden: o, estado: 'terminada' })}>
          <CheckCircle2 aria-hidden /> Terminé
        </Button>
      )}
    </li>
  )
}

/** Vista del Destajista: sus órdenes, "Empecé / Terminé" y lo que se le debe. Nada más (RLS solo le da lo suyo). */
export default function MisOrdenes() {
  const { empresa } = useEmpresaActiva()
  const soloLectura = useSoloLectura()
  const queryClient = useQueryClient()
  const ordenes = useQuery({ queryKey: ['produccion', empresa!.id, 'ordenes'], queryFn: () => leerOrdenes(empresa!.id) })
  const saldo = useQuery({ queryKey: ['produccion', empresa!.id, 'destajistas'], queryFn: () => leerSaldosDestajo(empresa!.id) })
  const pagos = useQuery({ queryKey: ['produccion', empresa!.id, 'mis-pagos'], queryFn: () => leerMisPagos(empresa!.id) })
  const abiertas = (ordenes.data ?? []).filter((o) => o.estado === 'pendiente' || o.estado === 'en_proceso').map((o) => o.id)
  const material = useMaterialEntregado(abiertas)
  const [accion, setAccion] = useState<Accion | null>(null)
  const [nota, setNota] = useState('')

  const marcar = useMutation({
    mutationFn: (a: Accion) => avanzarOrden(a.orden.id, a.estado, nota),
    onSuccess: async (_, a) => {
      await queryClient.invalidateQueries({ queryKey: ['produccion', empresa!.id] })
      toast.success(a.estado === 'en_proceso' ? '¡Listo! Marcada como empezada' : '¡Listo! Marcada como terminada')
      setAccion(null)
      setNota('')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })

  if (ordenes.isPending) return <Skeleton className="mx-auto h-96 w-full max-w-md rounded-2xl" />
  if (ordenes.error) return <p className="text-sm text-destructive">{mensajeError(ordenes.error)}</p>

  const mio = saldo.data?.[0]
  const grupos = [
    { titulo: 'En proceso', lista: ordenes.data.filter((o) => o.estado === 'en_proceso') },
    { titulo: 'Por empezar', lista: ordenes.data.filter((o) => o.estado === 'pendiente') },
  ]
  const terminadas = ordenes.data.filter((o) => o.estado === 'terminada').slice(0, 10)

  return (
    <div className="mx-auto grid w-full max-w-md gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Mis órdenes</h1>

      {mio && (
        <section aria-label="Mi saldo" className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-primary p-4 text-primary-foreground">
            <p className="text-sm opacity-80">Por cobrar</p>
            <p className="text-2xl font-semibold tracking-tight tabular">{moneda(mio.por_pagar)}</p>
            <p className="text-xs opacity-70">Trabajo terminado sin pagar</p>
          </div>
          <div className="rounded-2xl border p-4">
            <p className="text-sm text-muted-foreground">En curso</p>
            <p className="text-2xl font-semibold tracking-tight tabular">{moneda(mio.comprometido)}</p>
            <p className="text-xs text-muted-foreground">Al terminar, menos adelantos</p>
          </div>
        </section>
      )}

      {ordenes.data.length === 0 ? (
        <EstadoVacio icono={ClipboardList} titulo="No tienes órdenes asignadas" descripcion="Cuando te asignen trabajo, aquí verás qué hacer, para cuándo y cuánto te pagan." />
      ) : (
        grupos.map(
          (g) =>
            g.lista.length > 0 && (
              <section key={g.titulo} className="grid gap-3" aria-label={g.titulo}>
                <h2 className="font-medium">
                  {g.titulo} <span className="text-muted-foreground tabular">{g.lista.length}</span>
                </h2>
                <ul className="grid gap-3">
                  {g.lista.map((o) => (
                    <TarjetaOrden key={o.id} o={o} material={material.data?.filter((m) => m.orden_id === o.id) ?? []} onAccion={setAccion} bloqueado={soloLectura} />
                  ))}
                </ul>
              </section>
            ),
        )
      )}

      {terminadas.length > 0 && (
        <section className="grid gap-2" aria-label="Terminadas">
          <h2 className="font-medium">Terminadas</h2>
          <ul className="divide-y rounded-2xl border px-4">
            {terminadas.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="min-w-0 truncate">
                  {o.cantidad} × {o.descripcion}
                </span>
                <span className="text-right whitespace-nowrap tabular">
                  {Number(o.saldo) > 0 ? <span className="font-medium">Falta {moneda(o.saldo)}</span> : <span className="text-muted-foreground">Pagada</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pagos.data && pagos.data.length > 0 && (
        <section className="grid gap-2" aria-label="Mis pagos">
          <h2 className="font-medium">Mis pagos</h2>
          <ul className="divide-y rounded-2xl border px-4">
            {pagos.data.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="text-muted-foreground">
                  {fecha(g.fecha)}
                  {g.orden && ` · O-${g.orden.folio}`}
                  {g.nota && ` · ${g.nota}`}
                </span>
                <span className="font-medium tabular">{moneda(g.monto)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog open={!!accion} onOpenChange={(o) => !o && !marcar.isPending && setAccion(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{accion?.estado === 'en_proceso' ? '¿Empezaste esta orden?' : '¿Terminaste esta orden?'}</DialogTitle>
            <DialogDescription>
              {accion?.orden.cantidad} × {accion?.orden.descripcion}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="nota-avance">Nota (opcional)</Label>
            <Textarea id="nota-avance" rows={3} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. me faltó tela, entrego el viernes" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setAccion(null)} disabled={marcar.isPending}>
              Volver
            </Button>
            <Button size="lg" className="h-12" onClick={() => accion && marcar.mutate(accion)} disabled={marcar.isPending}>
              {marcar.isPending ? 'Guardando…' : accion?.estado === 'en_proceso' ? 'Sí, empecé' : 'Sí, terminé'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
