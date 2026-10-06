import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import type { Grupo } from '@/features/catalogo/api'
import { usePrecioModelo, type Seleccion } from '@/features/catalogo/use-precio'
import { mensajeError } from '@/lib/errores'
import { moneda } from '@/lib/formato'
import { cn } from '@/lib/utils'

const NINGUNA = '__ninguna__'

interface SelectoresProps {
  grupos: Grupo[]
  seleccion: Seleccion
  onCambiar: (seleccion: Seleccion) => void
  idPrefix: string
  mostrarAjuste?: boolean
  className?: string
}

/** Un select por grupo de opciones del modelo. Es la misma pieza que usará el cotizador. */
export function SelectoresOpciones({ grupos, seleccion, onCambiar, idPrefix, mostrarAjuste, className }: SelectoresProps) {
  if (grupos.length === 0) {
    return <p className="text-sm text-muted-foreground">Este modelo no tiene grupos de opciones.</p>
  }
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2', className)}>
      {grupos.map((g) => {
        const id = `${idPrefix}-${g.id}`
        return (
          <div key={g.id} className="grid gap-2">
            <Label htmlFor={id}>
              {g.nombre}
              {!g.obligatorio && <span className="font-normal text-muted-foreground"> (opcional)</span>}
            </Label>
            <Select
              value={seleccion[g.id] ?? (g.obligatorio ? '' : NINGUNA)}
              onValueChange={(v) => {
                const nueva = { ...seleccion }
                if (v === NINGUNA) delete nueva[g.id]
                else nueva[g.id] = v
                onCambiar(nueva)
              }}
            >
              <SelectTrigger id={id} className="w-full">
                <SelectValue placeholder={`Elige ${g.nombre.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {!g.obligatorio && <SelectItem value={NINGUNA}>Ninguna</SelectItem>}
                {g.opciones.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.nombre}
                    {mostrarAjuste && Number(o.ajuste_precio) !== 0 && (
                      <span className="text-muted-foreground tabular">
                        {' '}
                        {Number(o.ajuste_precio) > 0 ? '+' : ''}
                        {moneda(o.ajuste_precio)}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      })}
    </div>
  )
}

interface ResultadoProps {
  modeloId: string | null
  grupos: Grupo[]
  seleccion: Seleccion
  listaId: string | null
  sobreDiseno: boolean
  conCosto: boolean
  className?: string
}

/** Precio (y costo, si el rol lo ve) calculado por la base para la combinación elegida. */
export function ResultadoPrecio({ modeloId, grupos, seleccion, listaId, sobreDiseno, conCosto, className }: ResultadoProps) {
  const { data, isFetching, error, pendientes } = usePrecioModelo({ modeloId, grupos, seleccion, listaId, sobreDiseno, conCosto })

  let contenido
  if (!modeloId) contenido = <p className="text-sm text-muted-foreground">Elige un modelo.</p>
  else if (pendientes.length > 0)
    contenido = <p className="text-sm text-muted-foreground">Elige {pendientes.map((g) => g.nombre.toLowerCase()).join(', ')} para ver el precio.</p>
  else if (error) contenido = <p role="alert" className="text-sm text-destructive">{mensajeError(error)}</p>
  else if (!data) contenido = <Skeleton className="h-12 w-48" />
  else
    contenido = (
      <dl className={cn('flex flex-wrap gap-x-10 gap-y-3 transition-opacity', isFetching && 'opacity-60')}>
        {conCosto && (
          <div>
            <dt className="text-sm text-muted-foreground">Costo de producción</dt>
            <dd className="text-xl font-medium tabular">{moneda(data.costo)}</dd>
          </div>
        )}
        <div>
          <dt className="text-sm text-muted-foreground">Precio de venta</dt>
          <dd className="text-3xl font-semibold tracking-tight tabular">{sobreDiseno ? 'Manual' : moneda(data.precio)}</dd>
        </div>
      </dl>
    )

  return (
    <div className={cn('rounded-xl border bg-muted/30 p-4', className)} aria-live="polite">
      {contenido}
      {sobreDiseno && modeloId && <p className="mt-2 text-sm text-muted-foreground">Modelo sobre diseño: el precio se captura a mano al cotizar.</p>}
    </div>
  )
}
