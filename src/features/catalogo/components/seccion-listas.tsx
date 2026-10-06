import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Plus, Star } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { useEmpresaActiva, usePuedeEditar } from '@/app/empresa-activa'
import { Campo } from '@/components/campo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { actualizarLista, crearLista, type Lista } from '@/features/catalogo/api'
import { useListas, useRefrescarCatalogo } from '@/features/catalogo/hooks'
import { mensajeError } from '@/lib/errores'
import { porcentaje } from '@/lib/formato'

const REDONDEOS = [
  { valor: 0, nombre: 'Sin redondeo' },
  { valor: 1, nombre: 'Al peso' },
  { valor: 10, nombre: 'A la decena' },
  { valor: 50, nombre: 'A múltiplos de 50' },
  { valor: 100, nombre: 'A la centena' },
  { valor: 500, nombre: 'A múltiplos de 500' },
  { valor: 1000, nombre: 'Al millar' },
]
const nombreRedondeo = (r: number) => REDONDEOS.find((x) => x.valor === r)?.nombre ?? `A múltiplos de ${r}`

const schema = z.object({
  nombre: z.string().trim().min(1, 'Escribe el nombre.').max(60, 'Usa como máximo 60 caracteres.'),
  // Se captura como porcentaje sobre el precio base: 100 = igual, 90 = 10 % menos, 115 = 15 % más.
  factor_pct: z.coerce.number({ error: 'Escribe un número.' }).gt(0, 'Debe ser mayor que 0.').max(999, 'Como máximo 999 %.'),
  incluye_iva: z.boolean(),
  redondeo: z.coerce.number().int().min(0),
  activo: z.boolean(),
})
type Entrada = z.input<typeof schema>
type Salida = z.output<typeof schema>

function DialogoLista({ lista, abierto, onCerrar }: { lista: Lista | null; abierto: boolean; onCerrar: () => void }) {
  const { empresa } = useEmpresaActiva()
  const refrescar = useRefrescarCatalogo()
  const form = useForm<Entrada, unknown, Salida>({
    resolver: zodResolver(schema),
    defaultValues: lista
      ? { nombre: lista.nombre, factor_pct: Math.round(Number(lista.factor) * 10000) / 100, incluye_iva: lista.incluye_iva, redondeo: lista.redondeo, activo: lista.activo }
      : { nombre: '', factor_pct: 100, incluye_iva: false, redondeo: 0, activo: true },
  })
  const { errors } = form.formState

  const guardar = useMutation({
    mutationFn: async ({ factor_pct, ...v }: Salida) => {
      const datos = { ...v, factor: Math.round(factor_pct * 100) / 10000 }
      if (lista) await actualizarLista(lista.id, datos)
      else await crearLista(empresa!.id, datos)
    },
    onSuccess: async () => {
      await refrescar()
      toast.success(lista ? 'Lista actualizada' : 'Lista creada')
      onCerrar()
    },
  })

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={form.handleSubmit((v) => guardar.mutate(v))} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{lista ? `Editar ${lista.nombre}` : 'Nueva lista de precios'}</DialogTitle>
            <DialogDescription>Ajusta el precio que sale del catálogo para un canal: Expo, Mayoreo, Diseñadores…</DialogDescription>
          </DialogHeader>
          <Campo id="lista-nombre" etiqueta="Nombre" error={errors.nombre?.message}>
            <Input id="lista-nombre" aria-describedby="lista-nombre-nota" aria-invalid={!!errors.nombre} {...form.register('nombre')} />
          </Campo>
          <Campo id="lista-factor" etiqueta="Precio sobre el catálogo (%)" error={errors.factor_pct?.message} ayuda="100 = igual · 90 = 10 % menos · 115 = 15 % más.">
            <Input id="lista-factor" type="number" inputMode="decimal" step="0.01" className="tabular" aria-describedby="lista-factor-nota" aria-invalid={!!errors.factor_pct} {...form.register('factor_pct')} />
          </Campo>
          <Campo id="lista-redondeo" etiqueta="Redondeo hacia arriba">
            <Controller
              control={form.control}
              name="redondeo"
              render={({ field }) => (
                <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                  <SelectTrigger id="lista-redondeo" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REDONDEOS.map((r) => (
                      <SelectItem key={r.valor} value={String(r.valor)}>
                        {r.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Campo>
          <Controller
            control={form.control}
            name="incluye_iva"
            render={({ field }) => (
              <label className="flex items-center justify-between gap-4 rounded-xl border p-3">
                <span className="grid gap-0.5">
                  <span className="text-sm font-medium">Precios con IVA incluido</span>
                  <span className="text-sm text-muted-foreground">La cotización dirá "precios con IVA incluido" en lugar de desglosarlo.</span>
                </span>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </label>
            )}
          />
          {lista && (
            <Controller
              control={form.control}
              name="activo"
              render={({ field }) => (
                <label className="flex items-center justify-between gap-4 rounded-xl border p-3">
                  <span className="text-sm font-medium">Activa</span>
                  <Switch checked={field.value} onCheckedChange={field.onChange} disabled={lista.predeterminada} />
                </label>
              )}
            />
          )}
          {guardar.isError && (
            <p role="alert" className="text-sm text-destructive">
              {mensajeError(guardar.error)}
            </p>
          )}
          <DialogFooter>
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

export function SeccionListas() {
  const editar = usePuedeEditar('editar_catalogo')
  const refrescar = useRefrescarCatalogo()
  const listas = useListas()
  const [editando, setEditando] = useState<Lista | 'nueva' | null>(null)

  const predeterminar = useMutation({
    mutationFn: (l: Lista) => actualizarLista(l.id, { predeterminada: true, activo: true }),
    onSuccess: async (_, l) => {
      await refrescar()
      toast.success(`${l.nombre} es ahora la lista predeterminada`)
    },
    onError: (e) => toast.error(mensajeError(e)),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Listas de precios</CardTitle>
        <CardDescription>La predeterminada se usa en cada cotización nueva. Las demás se eligen al cotizar.</CardDescription>
        {editar && (
          <CardAction>
            <Button variant="outline" size="sm" onClick={() => setEditando('nueva')}>
              <Plus aria-hidden /> Nueva lista
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {listas.isPending ? (
          <Skeleton className="h-32" />
        ) : (
          <ul className="divide-y">
            {listas.data?.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium">
                    {l.nombre}
                    {l.predeterminada && <Badge variant="secondary">Predeterminada</Badge>}
                    {!l.activo && <Badge variant="outline">Inactiva</Badge>}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {Number(l.factor) === 1 ? 'Precio de catálogo' : `${porcentaje(l.factor)} del catálogo`} ·{' '}
                    {l.incluye_iva ? 'IVA incluido' : 'IVA aparte'} · {nombreRedondeo(l.redondeo)}
                  </p>
                </div>
                {editar && (
                  <div className="flex gap-1">
                    {!l.predeterminada && (
                      <Button variant="ghost" size="sm" onClick={() => predeterminar.mutate(l)} disabled={predeterminar.isPending}>
                        <Star aria-hidden /> Predeterminar
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setEditando(l)}>
                      Editar
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {editando && (
        <DialogoLista
          key={editando === 'nueva' ? 'nueva' : editando.id}
          abierto
          lista={editando === 'nueva' ? null : editando}
          onCerrar={() => setEditando(null)}
        />
      )}
    </Card>
  )
}
