import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Download, MessageCircle, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useEmpresaActiva, usePuede, usePuedeEditar } from '@/app/empresa-activa'
import { CampoMonto } from '@/components/campo-monto'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { descargar } from '@/features/cotizaciones/pdf/preparar'
import { nombreMetodo, subirPrivado, urlPrivadaQuinceDias } from '@/features/pedidos/api'
import {
  actualizarOrden,
  avanzarOrden,
  leerPagosOrden,
  leerSaldosDestajo,
  pagarDestajo,
  type EstadoOrden,
  type Orden,
} from '@/features/produccion/api'
import { prepararPdfOrden } from '@/features/produccion/pdf/preparar-orden'
import { mensajeError } from '@/lib/errores'
import { fecha, hoyMx, moneda } from '@/lib/formato'
import type { Enum } from '@/lib/supabase'
import { enlaceWhatsApp } from '@/lib/whatsapp'

const SIN = '__sin__'
const NOMBRE: Record<EstadoOrden, string> = { pendiente: 'Pendiente', en_proceso: 'En proceso', terminada: 'Terminada', cancelada: 'Cancelada' }

function PagoDestajo({ orden, onPagado }: { orden: Orden; onPagado: () => Promise<unknown> }) {
  const { empresa } = useEmpresaActiva()
  const pendiente = Number(orden.saldo)
  const [monto, setMonto] = useState<number | null>(pendiente || null)
  const [metodo, setMetodo] = useState<Enum<'metodo_pago'>>('efectivo')
  const [fechaPago, setFechaPago] = useState(hoyMx())
  const pagar = useMutation({
    mutationFn: () => {
      if (!monto || monto <= 0) throw new Error('Escribe el monto.')
      if (monto > pendiente) throw new Error(`Falta pagar ${moneda(pendiente)}; el pago no puede ser mayor.`)
      return pagarDestajo(empresa!.id, orden.id, { monto, metodo, fecha: fechaPago, nota: orden.estado === 'terminada' ? null : 'Adelanto' })
    },
    onSuccess: async () => {
      await onPagado()
      toast.success(orden.estado === 'terminada' ? 'Pago registrado' : 'Adelanto registrado')
    },
  })
  if (pendiente <= 0) return <p className="text-sm text-muted-foreground">Pagada por completo.</p>
  return (
    <div className="grid gap-3 rounded-xl border p-3">
      <p className="text-sm font-medium">{orden.estado === 'terminada' ? 'Registrar pago' : 'Registrar adelanto'}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <CampoMonto valor={monto} onConfirmar={setMonto} aria-label="Monto" />
        <Select value={metodo} onValueChange={(v) => setMetodo(v as Enum<'metodo_pago'>)}>
          <SelectTrigger className="w-full" aria-label="Forma de pago">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(['efectivo', 'transferencia', 'otro'] as const).map((m) => (
              <SelectItem key={m} value={m}>
                {nombreMetodo[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" max={hoyMx()} value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} aria-label="Fecha del pago" />
      </div>
      {pagar.isError && (
        <p role="alert" className="text-sm text-destructive">
          {mensajeError(pagar.error)}
        </p>
      )}
      <Button variant="outline" onClick={() => pagar.mutate()} disabled={pagar.isPending}>
        {pagar.isPending ? 'Registrando…' : `Pagar ${monto ? moneda(monto) : ''}`}
      </Button>
    </div>
  )
}

interface Props {
  orden: Orden | null
  onCerrar: () => void
}

export function DialogoOrden({ orden: o, onCerrar }: Props) {
  const { empresa } = useEmpresaActiva()
  const queryClient = useQueryClient()
  const gestionar = usePuedeEditar('gestionar_produccion')
  const pagarPermitido = usePuedeEditar('pagar_destajos')
  const verCostos = usePuede('ver_costos')
  const destajistas = useQuery({ queryKey: ['produccion', empresa!.id, 'destajistas'], queryFn: () => leerSaldosDestajo(empresa!.id), enabled: !!o })
  const pagos = useQuery({ queryKey: ['produccion', empresa!.id, 'pagos', o?.id], queryFn: () => leerPagosOrden(o!.id), enabled: !!o })
  const [nota, setNota] = useState('')

  const refrescar = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['produccion', empresa!.id] }),
      queryClient.invalidateQueries({ queryKey: ['pedidos', empresa!.id] }),
    ])
  const cambiar = useMutation({
    mutationFn: (c: Parameters<typeof actualizarOrden>[1]) => actualizarOrden(o!.id, c),
    onSuccess: refrescar,
    onError: (e) => toast.error(mensajeError(e)),
  })
  const mover = useMutation({
    mutationFn: (estado: EstadoOrden) => avanzarOrden(o!.id, estado, nota),
    onSuccess: async (_, estado) => {
      setNota('')
      await refrescar()
      toast.success(`O-${o!.folio}: ${NOMBRE[estado].toLowerCase()}`)
      if (estado === 'cancelada') onCerrar()
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
  const pdf = useMutation({
    mutationFn: async (modo: 'descargar' | 'whatsapp') => {
      const blob = await prepararPdfOrden(empresa!.id, o!)
      const nombre = `Orden-O-${o!.folio}.pdf`
      if (modo === 'descargar') return descargar(blob, nombre)
      const ruta = await subirPrivado(empresa!.id, 'pedidos', o!.renglon?.pedido?.id ?? 'sin-pedido', blob, nombre)
      return urlPrivadaQuinceDias(ruta, nombre)
    },
  })

  if (!o) return null
  const estado = o.estado as EstadoOrden
  const textoWa = (enlace: string) =>
    [
      `Hola ${o.destajista?.nombre ?? ''}, te comparto la orden O-${o.folio} de ${empresa!.nombre}:`,
      `${o.etapa?.nombre}: ${o.cantidad} × ${o.descripcion}`,
      o.fecha_compromiso ? `Entrega: ${fecha(o.fecha_compromiso)}` : null,
      `Pago acordado: ${moneda(o.costo_acordado)}`,
      '',
      `Orden en PDF: ${enlace}`,
    ]
      .filter((x) => x !== null)
      .join('\n')

  return (
    <Dialog open={!!o} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            O-{o.folio} · {o.etapa?.nombre}
            <Badge variant="secondary">{NOMBRE[estado]}</Badge>
          </DialogTitle>
          <DialogDescription>
            {o.cantidad} × {o.descripcion}
            {o.renglon?.pedido && ` · Pedido P-${o.renglon.pedido.folio}`}
          </DialogDescription>
        </DialogHeader>

        {gestionar && (
          <div className="grid gap-2">
            <Label htmlFor="ord-nota">Nota (opcional, se guarda con el cambio)</Label>
            <Input id="ord-nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. faltó tela, se reprogramó…" />
            <div className="flex flex-wrap gap-2">
              {estado === 'pendiente' && <Button onClick={() => mover.mutate('en_proceso')} disabled={mover.isPending}>Empezar</Button>}
              {estado !== 'terminada' && <Button variant={estado === 'en_proceso' ? 'default' : 'outline'} onClick={() => mover.mutate('terminada')} disabled={mover.isPending}>Terminar</Button>}
              {estado === 'en_proceso' && (
                <Button variant="ghost" onClick={() => mover.mutate('pendiente')} disabled={mover.isPending}>
                  <Undo2 aria-hidden /> Regresar a pendiente
                </Button>
              )}
              {estado === 'terminada' && (
                <Button variant="ghost" onClick={() => mover.mutate('en_proceso')} disabled={mover.isPending}>
                  <Undo2 aria-hidden /> Reabrir
                </Button>
              )}
              {estado !== 'terminada' && Number(o.pagado) === 0 && (
                <Button variant="ghost" className="text-destructive" onClick={() => mover.mutate('cancelada')} disabled={mover.isPending}>
                  <Ban aria-hidden /> Cancelar orden
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="ord-dest">Destajista</Label>
            <Select
              value={o.destajista_id ?? SIN}
              onValueChange={(v) => cambiar.mutate({ destajista_id: v === SIN ? null : v })}
              disabled={!gestionar || Number(o.pagado) > 0}
            >
              <SelectTrigger id="ord-dest" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN}>Sin asignar</SelectItem>
                {destajistas.data
                  ?.filter((d) => d.activo || d.destajista_id === o.destajista_id)
                  .map((d) => (
                    <SelectItem key={d.destajista_id} value={d.destajista_id!}>
                      {d.nombre}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {Number(o.pagado) > 0 && <p className="text-xs text-muted-foreground">Tiene pagos: ya no se reasigna.</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ord-fecha">Fecha compromiso</Label>
            <Input
              id="ord-fecha"
              type="date"
              key={`f-${o.fecha_compromiso}`}
              defaultValue={o.fecha_compromiso ?? ''}
              disabled={!gestionar}
              onBlur={(e) => (e.target.value || null) !== o.fecha_compromiso && cambiar.mutate({ fecha_compromiso: e.target.value || null })}
            />
          </div>
          {verCostos && (
            <div className="grid gap-2">
              <Label htmlFor="ord-costo">Pago acordado</Label>
              <CampoMonto id="ord-costo" valor={Number(o.costo_acordado)} disabled={!gestionar} onConfirmar={(v) => cambiar.mutate({ costo_acordado: v ?? 0 })} />
              <p className="text-xs text-muted-foreground tabular">
                Pagado {moneda(o.pagado)} · falta {moneda(o.saldo)}
              </p>
            </div>
          )}
        </div>

        {o.notas && <p className="rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-line text-muted-foreground">{o.notas}</p>}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => pdf.mutate('descargar')} disabled={pdf.isPending}>
            <Download aria-hidden /> PDF
          </Button>
          {gestionar && (
            <Button
              variant="outline"
              size="sm"
              disabled={pdf.isPending}
              onClick={async () => {
                const ventana = window.open('', '_blank') // en el mismo clic, para que no la bloqueen
                try {
                  const enlace = (await pdf.mutateAsync('whatsapp')) as string
                  const url = enlaceWhatsApp(textoWa(enlace), o.destajista?.telefono)
                  if (ventana) {
                    ventana.opener = null
                    ventana.location.href = url
                  }
                } catch (e) {
                  ventana?.close()
                  toast.error(mensajeError(e))
                }
              }}
            >
              <MessageCircle aria-hidden /> Mandar por WhatsApp
            </Button>
          )}
        </div>

        {verCostos && (
          <section className="grid gap-3 border-t pt-4" aria-labelledby="ord-pagos">
            <h3 id="ord-pagos" className="font-medium">
              Pagos al destajista
            </h3>
            {pagos.data?.length ? (
              <ul className="divide-y text-sm">
                {pagos.data.map((g) => (
                  <li key={g.id} className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">
                      {fecha(g.fecha)} · {nombreMetodo[g.metodo]}
                      {g.nota && ` · ${g.nota}`}
                    </span>
                    <span className="tabular">{moneda(g.monto)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Sin pagos todavía.</p>
            )}
            {pagarPermitido && estado !== 'cancelada' && <PagoDestajo key={`${o.id}-${o.saldo}`} orden={o} onPagado={refrescar} />}
          </section>
        )}
      </DialogContent>
    </Dialog>
  )
}
