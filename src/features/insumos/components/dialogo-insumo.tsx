import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { useEmpresaActiva, usePuedeEditar } from '@/app/empresa-activa'
import { Campo } from '@/components/campo'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  actualizarInsumo,
  borrarInsumo,
  crearInsumo,
  nombreTipo,
  nombreUnidad,
  TIPOS_INSUMO,
  UNIDADES,
  unidadSugerida,
  type Insumo,
  type TipoInsumo,
  type Unidad,
} from '@/features/insumos/api'
import { mensajeError } from '@/lib/errores'
import { cantidad as fmtCantidad } from '@/lib/formato'
import { leerMonto } from '@/lib/montos'

/** Texto numérico opcional ("1,200.5") → número ≥ 0, o null si va vacío. */
const numeroOpcional = (mensaje: string) =>
  z
    .string()
    .trim()
    .refine((v) => {
      const n = leerMonto(v)
      return n === null || (!Number.isNaN(n) && n >= 0)
    }, mensaje)
    .transform((v) => leerMonto(v))

const schema = z
  .object({
    nombre: z.string().trim().min(2, 'Escribe el nombre del insumo.').max(80, 'Usa como máximo 80 caracteres.'),
    tipo: z.enum(TIPOS_INSUMO),
    unidad: z.enum(UNIDADES),
    minimo: numeroOpcional('Escribe un número mayor o igual a cero.'),
    proveedor: z.string().trim().max(120, 'Usa como máximo 120 caracteres.').transform((v) => v || null),
    existencia_inicial: numeroOpcional('Escribe un número mayor o igual a cero.'),
    costo_inicial: numeroOpcional('Escribe un costo mayor o igual a cero.'),
    activo: z.boolean(),
  })
  .refine((v) => !(v.existencia_inicial && v.existencia_inicial > 0 && v.costo_inicial === null), {
    path: ['costo_inicial'],
    message: 'Escribe el costo unitario: toda entrada lleva costo para calcular el promedio.',
  })
type Entrada = z.input<typeof schema>
type Salida = z.output<typeof schema>

interface Props {
  insumo: Insumo | null
  onCerrar: () => void
  onCreado?: (id: string) => void
  onBorrado?: () => void
}

export function DialogoInsumo({ insumo: i, onCerrar, onCreado, onBorrado }: Props) {
  const { empresa } = useEmpresaActiva()
  const queryClient = useQueryClient()
  const esAdmin = usePuedeEditar('gestionar_usuarios')
  const nuevo = i === null
  const conMovimientos = !nuevo && !!i.ultimo_movimiento_at
  const form = useForm<Entrada, unknown, Salida>({
    resolver: zodResolver(schema),
    defaultValues: nuevo
      ? { nombre: '', tipo: 'otro', unidad: 'pza', minimo: '', proveedor: '', existencia_inicial: '', costo_inicial: '', activo: true }
      : {
          nombre: i.nombre ?? '',
          tipo: (i.tipo ?? 'otro') as TipoInsumo,
          unidad: (i.unidad ?? 'pza') as Unidad,
          minimo: Number(i.minimo) ? fmtCantidad(i.minimo) : '',
          proveedor: i.proveedor ?? '',
          existencia_inicial: '',
          costo_inicial: '',
          activo: !!i.activo,
        },
  })
  const { errors } = form.formState
  const unidadElegida = useWatch({ control: form.control, name: 'unidad' })

  const refrescar = () => queryClient.invalidateQueries({ queryKey: ['insumos', empresa!.id] })
  const guardar = useMutation({
    mutationFn: async (v: Salida) => {
      const base = { nombre: v.nombre, tipo: v.tipo, unidad: v.unidad, minimo: v.minimo ?? 0, proveedor: v.proveedor }
      if (nuevo) return crearInsumo(empresa!.id, { ...base, existencia_inicial: v.existencia_inicial ?? 0, costo_inicial: v.costo_inicial })
      await actualizarInsumo(i.id!, { ...base, ...(conMovimientos ? { unidad: undefined } : {}), activo: v.activo })
      return i.id!
    },
    onSuccess: async (id) => {
      await refrescar()
      toast.success(nuevo ? 'Insumo agregado' : 'Insumo actualizado')
      onCerrar()
      if (nuevo && id) onCreado?.(id)
    },
  })
  const borrar = useMutation({
    mutationFn: () => borrarInsumo(i!.id!),
    onSuccess: async () => {
      await refrescar()
      toast.success('Insumo eliminado')
      onCerrar()
      onBorrado?.()
    },
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={form.handleSubmit((v) => guardar.mutate(v))} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{nuevo ? 'Nuevo insumo' : `Editar ${i.nombre}`}</DialogTitle>
            <DialogDescription>Madera, tela, piel, espuma, herrajes, acabados o empaque, con la unidad en que lo compras y lo entregas.</DialogDescription>
          </DialogHeader>
          <Campo id="ins-nombre" etiqueta="Nombre" error={errors.nombre?.message}>
            <Input id="ins-nombre" autoFocus placeholder="Piel Napa café" aria-invalid={!!errors.nombre} aria-describedby="ins-nombre-nota" {...form.register('nombre')} />
          </Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="ins-tipo" etiqueta="Tipo">
              <Controller
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v)
                      const sugerida = unidadSugerida[v as TipoInsumo]
                      if (nuevo && sugerida) form.setValue('unidad', sugerida)
                    }}
                  >
                    <SelectTrigger id="ins-tipo" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_INSUMO.map((t) => (
                        <SelectItem key={t} value={t}>
                          {nombreTipo[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Campo>
            <Campo id="ins-unidad" etiqueta="Unidad" ayuda={conMovimientos ? 'Ya tiene movimientos: la unidad no cambia.' : undefined}>
              <Controller
                control={form.control}
                name="unidad"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={conMovimientos}>
                    <SelectTrigger id="ins-unidad" className="w-full" aria-describedby="ins-unidad-nota">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIDADES.map((u) => (
                        <SelectItem key={u} value={u}>
                          {nombreUnidad[u]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Campo>
            <Campo id="ins-minimo" etiqueta={`Mínimo (${nombreUnidad[unidadElegida]})`} error={errors.minimo?.message} ayuda="Avisa cuando la existencia baje de aquí. Vacío: sin alerta.">
              <Input id="ins-minimo" inputMode="decimal" autoComplete="off" className="text-right tabular" aria-invalid={!!errors.minimo} aria-describedby="ins-minimo-nota" {...form.register('minimo')} />
            </Campo>
            <Campo id="ins-proveedor" etiqueta="Proveedor (opcional)" error={errors.proveedor?.message}>
              <Input id="ins-proveedor" aria-invalid={!!errors.proveedor} {...form.register('proveedor')} />
            </Campo>
          </div>

          {nuevo && (
            <fieldset className="grid gap-4 rounded-xl border p-3 sm:grid-cols-2">
              <legend className="px-1 text-sm font-medium">Existencia inicial (opcional)</legend>
              <Campo id="ins-exist" etiqueta={`Cantidad (${nombreUnidad[unidadElegida]})`} error={errors.existencia_inicial?.message}>
                <Input id="ins-exist" inputMode="decimal" autoComplete="off" className="text-right tabular" aria-invalid={!!errors.existencia_inicial} aria-describedby="ins-exist-nota" {...form.register('existencia_inicial')} />
              </Campo>
              <Campo id="ins-costo" etiqueta={`Costo unitario por ${nombreUnidad[unidadElegida]}`} error={errors.costo_inicial?.message}>
                <Input id="ins-costo" inputMode="decimal" autoComplete="off" placeholder="$0.00" className="text-right tabular" aria-invalid={!!errors.costo_inicial} aria-describedby="ins-costo-nota" {...form.register('costo_inicial')} />
              </Campo>
              <p className="text-sm text-muted-foreground sm:col-span-2">Se registra como la primera entrada, con su costo, para calcular el costo promedio.</p>
            </fieldset>
          )}

          {!nuevo && (
            <Controller
              control={form.control}
              name="activo"
              render={({ field }) => (
                <label className="flex items-center justify-between gap-4 rounded-xl border p-3 text-sm font-medium">
                  Activo (se pueden registrar movimientos)
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </label>
              )}
            />
          )}

          {(guardar.isError || borrar.isError) && (
            <p role="alert" className="text-sm text-destructive">
              {mensajeError(guardar.error ?? borrar.error)}
            </p>
          )}
          <DialogFooter className="gap-2">
            {!nuevo && esAdmin && !conMovimientos && (
              <Button type="button" variant="ghost" className="mr-auto text-destructive" onClick={() => borrar.mutate()} disabled={borrar.isPending}>
                <Trash2 aria-hidden /> Eliminar
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardar.isPending}>
              {guardar.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
