import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { useEmpresaActiva } from '@/app/empresa-activa'
import { CampoMonto } from '@/components/campo-monto'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { crearOrdenes, leerSaldosDestajo, sugerirOrdenes, type Sugerencia } from '@/features/produccion/api'
import { mensajeError } from '@/lib/errores'
import { moneda } from '@/lib/formato'

const SIN = '__sin__'

interface Fila {
  elegida: boolean
  costo: number | null
  destajista: string
  fecha: string
}

interface Props {
  abierto: boolean
  onCerrar: () => void
  pedido: { id: string; folio: number | null; fecha_compromiso: string | null }
}

const clave = (s: Sugerencia) => `${s.pedido_item_id}:${s.etapa_id}`

/** Crea las órdenes de un pedido: por renglón, las etapas con costo en el modelo y su costo sugerido (editable). */
export function DialogoMandarProduccion({ abierto, onCerrar, pedido }: Props) {
  const { empresa } = useEmpresaActiva()
  const queryClient = useQueryClient()
  const sugerencias = useQuery({ queryKey: ['produccion', empresa!.id, 'sugerencias', pedido.id], queryFn: () => sugerirOrdenes(pedido.id), staleTime: 0 })
  const destajistas = useQuery({ queryKey: ['produccion', empresa!.id, 'destajistas'], queryFn: () => leerSaldosDestajo(empresa!.id) })
  const [filas, setFilas] = useState<Record<string, Fila>>({})
  const [paraTodas, setParaTodas] = useState<string>(SIN)

  // Valores iniciales: etapas con costo y sin orden, con el costo sugerido y la fecha del pedido.
  const fila = (s: Sugerencia): Fila =>
    filas[clave(s)] ?? {
      elegida: s.con_costo && !s.tiene_orden,
      costo: Number(s.costo_sugerido),
      destajista: SIN,
      fecha: pedido.fecha_compromiso ?? '',
    }
  const cambiar = (s: Sugerencia, c: Partial<Fila>) => setFilas((f) => ({ ...f, [clave(s)]: { ...fila(s), ...c } }))

  const porRenglon = new Map<string, Sugerencia[]>()
  for (const s of sugerencias.data ?? []) porRenglon.set(s.pedido_item_id, [...(porRenglon.get(s.pedido_item_id) ?? []), s])
  const elegidas = (sugerencias.data ?? []).filter((s) => !s.tiene_orden && fila(s).elegida)
  const activos = destajistas.data?.filter((d) => d.activo) ?? []

  const crear = useMutation({
    mutationFn: () =>
      crearOrdenes(
        empresa!.id,
        elegidas.map((s) => {
          const f = fila(s)
          const destajista = f.destajista !== SIN ? f.destajista : paraTodas !== SIN ? paraTodas : null
          return {
            pedido_item_id: s.pedido_item_id,
            etapa_id: s.etapa_id,
            destajista_id: destajista,
            cantidad: s.cantidad,
            costo_acordado: f.costo ?? 0,
            fecha_compromiso: f.fecha || null,
          }
        }),
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['produccion', empresa!.id] }),
        queryClient.invalidateQueries({ queryKey: ['pedidos', empresa!.id] }),
      ])
      toast.success(elegidas.length === 1 ? 'Orden creada' : `${elegidas.length} órdenes creadas`)
      onCerrar()
    },
  })

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && !crear.isPending && onCerrar()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Mandar a producción · P-{pedido.folio}</DialogTitle>
          <DialogDescription>Marcamos las etapas con costo en el modelo y sugerimos el pago: costo de la etapa × cantidad. Ajusta lo que necesites.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-3 rounded-xl bg-muted/40 p-3">
          <div className="grid min-w-56 flex-1 gap-1.5">
            <Label htmlFor="mp-todas">Asignar todo a</Label>
            <Select value={paraTodas} onValueChange={setParaTodas}>
              <SelectTrigger id="mp-todas" className="w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN}>Sin asignar (lo elijo por etapa)</SelectItem>
                {activos.map((d) => (
                  <SelectItem key={d.destajista_id} value={d.destajista_id!}>
                    {d.nombre}
                    {d.especialidad && <span className="text-muted-foreground"> · {d.especialidad}</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {sugerencias.isPending ? (
          <Skeleton className="h-48" />
        ) : sugerencias.error ? (
          <p className="text-sm text-destructive">{mensajeError(sugerencias.error)}</p>
        ) : (
          <div className="grid gap-5">
            {[...porRenglon.values()].map((etapas) => {
              const r = etapas[0]
              return (
                <section key={r.pedido_item_id} className="grid gap-2">
                  <h3 className="font-medium">
                    {r.cantidad} × {r.descripcion}
                    {r.opciones_texto && <span className="font-normal text-muted-foreground"> · {r.opciones_texto}</span>}
                  </h3>
                  <ul className="divide-y rounded-xl border">
                    {etapas.map((s) => {
                      const f = fila(s)
                      const id = `mp-${clave(s)}`
                      return (
                        <li key={s.etapa_id} className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 p-3 sm:grid-cols-[auto_9rem_8rem_11rem_9.5rem]">
                          <Checkbox id={id} checked={!s.tiene_orden && f.elegida} disabled={s.tiene_orden} onCheckedChange={(v) => cambiar(s, { elegida: !!v })} />
                          <Label htmlFor={id} className="grid gap-0 font-normal">
                            <span className={s.tiene_orden ? 'text-muted-foreground' : 'font-medium'}>{s.etapa}</span>
                            <span className="text-xs text-muted-foreground">
                              {s.tiene_orden ? 'Ya tiene orden' : s.con_costo ? `${moneda(s.costo_unitario)} c/u` : 'Sin costo en el modelo'}
                            </span>
                          </Label>
                          {!s.tiene_orden && (
                            <>
                              <CampoMonto
                                valor={f.costo}
                                disabled={!f.elegida}
                                onConfirmar={(v) => cambiar(s, { costo: v })}
                                aria-label={`Pago acordado para ${s.etapa}`}
                                className="col-span-2 sm:col-span-1"
                              />
                              <Select value={f.destajista} onValueChange={(v) => cambiar(s, { destajista: v })} disabled={!f.elegida}>
                                <SelectTrigger className="w-full" aria-label={`Proveedor para ${s.etapa}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={SIN}>{paraTodas !== SIN ? 'Como "Asignar todo"' : 'Sin asignar'}</SelectItem>
                                  {activos.map((d) => (
                                    <SelectItem key={d.destajista_id} value={d.destajista_id!}>
                                      {d.nombre}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input type="date" value={f.fecha} disabled={!f.elegida} onChange={(e) => cambiar(s, { fecha: e.target.value })} aria-label={`Fecha compromiso para ${s.etapa}`} />
                            </>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )
            })}
          </div>
        )}

        {crear.isError && (
          <p role="alert" className="text-sm text-destructive">
            {mensajeError(crear.error)}
          </p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onCerrar} disabled={crear.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => crear.mutate()} disabled={elegidas.length === 0 || crear.isPending}>
            {crear.isPending ? 'Creando…' : elegidas.length === 1 ? 'Crear 1 orden' : `Crear ${elegidas.length} órdenes`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
