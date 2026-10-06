import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { useEmpresaActiva } from '@/app/empresa-activa'
import { Campo } from '@/components/campo'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ajustarExistencia, leerInsumos, registrarMovimiento, unidad, type Insumo } from '@/features/insumos/api'
import { leerOrdenes } from '@/features/produccion/api'
import { mensajeError } from '@/lib/errores'
import { cantidad as fmtCantidad, monedaPrecisa } from '@/lib/formato'
import { leerMonto } from '@/lib/montos'
import { cn } from '@/lib/utils'

export type TipoDialogo = 'entrada' | 'salida' | 'ajuste'

const SIN_ORDEN = '__sin__'
const TITULO: Record<TipoDialogo, string> = { entrada: 'Registrar entrada', salida: 'Registrar salida', ajuste: 'Ajustar existencia' }
const AYUDA: Record<TipoDialogo, string> = {
  entrada: 'Lo que compras o recibes. Su costo actualiza el costo promedio.',
  salida: 'Lo que sale del almacén. Si se lo entregas a un destajista, lígala a su orden.',
  ajuste: 'Cuenta lo que hay físicamente: la base registra la diferencia con su motivo.',
}

interface Props {
  tipo: TipoDialogo
  /** Insumo fijo (desde su ficha). Sin él, se elige de la lista (desde la ficha de una orden). */
  insumo?: Insumo
  /** Orden fija: "Entregar material" desde la ficha de la orden. */
  orden?: { id: string; folio: number | null; etapa: string | null | undefined; destajista: string | null | undefined }
  onCerrar: () => void
}

export function DialogoMovimiento({ tipo, insumo: fijo, orden, onCerrar }: Props) {
  const { empresa } = useEmpresaActiva()
  const queryClient = useQueryClient()
  const insumos = useQuery({ queryKey: ['insumos', empresa!.id, 'lista'], queryFn: () => leerInsumos(empresa!.id), enabled: !fijo })
  const ordenes = useQuery({ queryKey: ['produccion', empresa!.id, 'ordenes'], queryFn: () => leerOrdenes(empresa!.id), enabled: tipo === 'salida' && !orden })
  const [insumoId, setInsumoId] = useState(fijo?.id ?? '')
  const [cantidadTxt, setCantidadTxt] = useState('')
  const [costoTxt, setCostoTxt] = useState('')
  const [ordenId, setOrdenId] = useState(orden?.id ?? SIN_ORDEN)
  const [nota, setNota] = useState('')
  const [error, setError] = useState<{ campo: 'insumo' | 'cantidad' | 'costo' | 'nota'; mensaje: string } | null>(null)

  const insumo = fijo ?? insumos.data?.find((x) => x.id === insumoId)
  const u = unidad(insumo?.unidad)

  const guardar = useMutation({
    mutationFn: async () => {
      setError(null)
      const falla = (campo: 'insumo' | 'cantidad' | 'costo' | 'nota', mensaje: string) => {
        setError({ campo, mensaje })
        return Promise.reject(new Error(mensaje))
      }
      if (!insumo?.id) return falla('insumo', 'Elige el insumo.')
      const n = leerMonto(cantidadTxt)
      if (tipo === 'ajuste') {
        if (n === null || Number.isNaN(n) || n < 0) return falla('cantidad', 'Escribe cuánto hay físicamente (cero o más).')
        if (!nota.trim()) return falla('nota', 'Escribe el motivo del ajuste.')
        return ajustarExistencia(insumo.id, n, nota.trim())
      }
      if (n === null || Number.isNaN(n) || n <= 0) return falla('cantidad', 'Escribe una cantidad mayor que cero.')
      if (tipo === 'entrada') {
        const c = leerMonto(costoTxt)
        if (c === null || Number.isNaN(c) || c < 0) return falla('costo', 'Escribe el costo unitario: toda entrada lleva costo.')
        return registrarMovimiento(empresa!.id, { insumo_id: insumo.id, tipo: 'entrada', cantidad: n, costo_unitario: c, nota: nota.trim() || null })
      }
      return registrarMovimiento(empresa!.id, {
        insumo_id: insumo.id,
        tipo: 'salida',
        cantidad: n,
        orden_id: ordenId === SIN_ORDEN ? null : ordenId,
        nota: nota.trim() || null,
      })
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['insumos', empresa!.id] }),
        queryClient.invalidateQueries({ queryKey: ['produccion', empresa!.id, 'material'] }),
      ])
      toast.success(tipo === 'entrada' ? 'Entrada registrada' : tipo === 'salida' ? (orden ? 'Material entregado' : 'Salida registrada') : 'Existencia ajustada')
      onCerrar()
    },
  })
  const errorDe = (campo: 'insumo' | 'cantidad' | 'costo' | 'nota') => (error?.campo === campo ? error.mensaje : undefined)
  const errorBase = guardar.isError && !error ? mensajeError(guardar.error) : null

  return (
    <Dialog open onOpenChange={(o) => !o && !guardar.isPending && onCerrar()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            guardar.mutate()
          }}
        >
          <DialogHeader>
            <DialogTitle>{orden ? `Entregar material · O-${orden.folio}` : `${TITULO[tipo]}${fijo ? ` · ${fijo.nombre}` : ''}`}</DialogTitle>
            <DialogDescription>
              {orden ? `${orden.etapa ?? 'Orden'}${orden.destajista ? ` · se registra como entregado a ${orden.destajista}` : ''}.` : AYUDA[tipo]}
            </DialogDescription>
          </DialogHeader>

          {!fijo && (
            <Campo id="mov-insumo" etiqueta="Insumo" error={errorDe('insumo')}>
              <Select value={insumoId} onValueChange={setInsumoId}>
                <SelectTrigger id="mov-insumo" className="w-full" aria-invalid={!!errorDe('insumo')} aria-describedby="mov-insumo-nota">
                  <SelectValue placeholder={insumos.isPending ? 'Cargando…' : 'Elige un insumo'} />
                </SelectTrigger>
                <SelectContent>
                  {insumos.data
                    ?.filter((x) => x.activo)
                    .map((x) => (
                      <SelectItem key={x.id} value={x.id!}>
                        {x.nombre} · hay {fmtCantidad(x.existencia)} {unidad(x.unidad)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Campo>
          )}
          {!fijo && insumos.data?.filter((x) => x.activo).length === 0 && (
            <p className="text-sm text-muted-foreground">No hay insumos activos. Dalos de alta en Insumos.</p>
          )}

          {insumo && (
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground tabular">
              Existencia: <span className="font-medium text-foreground">{fmtCantidad(insumo.existencia)} {u}</span> · Costo promedio {monedaPrecisa(insumo.costo_unitario)}
            </p>
          )}

          <div className={cn('grid gap-4', tipo === 'entrada' && 'sm:grid-cols-2')}>
            <Campo id="mov-cantidad" etiqueta={tipo === 'ajuste' ? `Existencia contada${u ? ` (${u})` : ''}` : `Cantidad${u ? ` (${u})` : ''}`} error={errorDe('cantidad')}>
              <Input
                id="mov-cantidad"
                inputMode="decimal"
                autoComplete="off"
                autoFocus={!!fijo}
                className="text-right tabular"
                value={cantidadTxt}
                onChange={(e) => setCantidadTxt(e.target.value)}
                aria-invalid={!!errorDe('cantidad')}
                aria-describedby="mov-cantidad-nota"
              />
            </Campo>
            {tipo === 'entrada' && (
              <Campo id="mov-costo" etiqueta={`Costo unitario${u ? ` por ${u}` : ''}`} error={errorDe('costo')}>
                <Input
                  id="mov-costo"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="$0.00"
                  className="text-right tabular"
                  value={costoTxt}
                  onChange={(e) => setCostoTxt(e.target.value)}
                  aria-invalid={!!errorDe('costo')}
                  aria-describedby="mov-costo-nota"
                />
              </Campo>
            )}
          </div>

          {tipo === 'salida' && !orden && (
            <Campo id="mov-orden" etiqueta="Entregado a (orden de producción)" ayuda="Opcional. Aparecerá como material entregado en esa orden.">
              <Select value={ordenId} onValueChange={setOrdenId}>
                <SelectTrigger id="mov-orden" className="w-full" aria-describedby="mov-orden-nota">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_ORDEN}>Sin orden (uso general)</SelectItem>
                  {ordenes.data?.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      O-{o.folio} · {o.etapa?.nombre} · {o.destajista?.nombre ?? 'Sin asignar'} · {o.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
          )}

          <Campo id="mov-nota" etiqueta={tipo === 'ajuste' ? 'Motivo' : 'Nota (opcional)'} error={errorDe('nota')}>
            <Textarea
              id="mov-nota"
              rows={2}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder={tipo === 'ajuste' ? 'Ej. conteo de fin de mes, merma por corte' : tipo === 'entrada' ? 'Ej. factura 1234 de Pieles del Bajío' : 'Ej. para el sofá del pedido P-12'}
              aria-invalid={!!errorDe('nota')}
              aria-describedby="mov-nota-nota"
            />
          </Campo>

          {errorBase && (
            <p role="alert" className="text-sm text-destructive">
              {errorBase}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onCerrar} disabled={guardar.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardar.isPending}>
              {guardar.isPending ? 'Guardando…' : orden ? 'Entregar' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
