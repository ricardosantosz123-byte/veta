import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { History } from 'lucide-react'
import { useState } from 'react'
import { Campo } from '@/components/campo'
import { EstadoVacio } from '@/components/estado-vacio'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { leerBitacora, POR_PAGINA, TABLAS_BITACORA, type FiltroBitacora, type RegistroBitacora, type TablaBitacora } from '@/features/ajustes/api'
import { leerEquipo } from '@/features/cotizaciones/api'
import { mensajeError } from '@/lib/errores'
import { fechaHora } from '@/lib/formato'
import { estadoPedido } from '@/lib/estados'

const TODOS = '__todos__'
const OPERACION: Record<string, string> = { INSERT: 'Alta', UPDATE: 'Cambio', DELETE: 'Borrado' }
const PREFIJO: Partial<Record<TablaBitacora, string>> = { cotizaciones: 'C-', pedidos: 'P-', pagos_cliente: 'R-', ordenes_produccion: 'O-' }

/** Resumen legible del registro: folio, nombre y estado cuando existen. */
function resumen(r: RegistroBitacora): string {
  const d = (r.datos ?? {}) as Record<string, unknown>
  const partes: string[] = []
  const prefijo = PREFIJO[r.tabla as TablaBitacora]
  if (d.folio !== undefined && d.folio !== null) partes.push(`${prefijo ?? '#'}${d.folio}`)
  if (typeof d.nombre === 'string') partes.push(d.nombre)
  if (typeof d.descripcion === 'string') partes.push(d.descripcion)
  if (typeof d.estado === 'string') partes.push(estadoPedido[d.estado as keyof typeof estadoPedido]?.nombre ?? d.estado)
  if (d.anulado === true) partes.push('anulado')
  return partes.join(' · ')
}

/** Ajustes > Bitácora (Admin): quién hizo qué y cuándo, filtrable por tabla, usuario y fecha. */
export function AjustesBitacora({ empresaId }: { empresaId: string }) {
  const [filtro, setFiltro] = useState<FiltroBitacora>({ tabla: null, usuario: null, desde: null, hasta: null })
  const equipo = useQuery({ queryKey: ['equipo', empresaId], queryFn: () => leerEquipo(empresaId), staleTime: 5 * 60_000 })
  const registros = useInfiniteQuery({
    queryKey: ['bitacora', empresaId, filtro],
    queryFn: ({ pageParam }) => leerBitacora(empresaId, filtro, pageParam),
    initialPageParam: 0,
    getNextPageParam: (ultima, todas) => (ultima.length === POR_PAGINA ? todas.length : undefined),
  })
  const nombre = (id: string | null) => (id ? (equipo.data?.find((e) => e.user_id === id)?.nombre ?? 'Usuario') : 'Sistema')
  const filas = registros.data?.pages.flat() ?? []

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Campo id="bit-tabla" etiqueta="Qué">
          <Select value={filtro.tabla ?? TODOS} onValueChange={(v) => setFiltro((f) => ({ ...f, tabla: v === TODOS ? null : (v as TablaBitacora) }))}>
            <SelectTrigger id="bit-tabla" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todo</SelectItem>
              {(Object.keys(TABLAS_BITACORA) as TablaBitacora[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {TABLAS_BITACORA[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
        <Campo id="bit-usuario" etiqueta="Quién">
          <Select value={filtro.usuario ?? TODOS} onValueChange={(v) => setFiltro((f) => ({ ...f, usuario: v === TODOS ? null : v }))}>
            <SelectTrigger id="bit-usuario" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos</SelectItem>
              {equipo.data?.map((e) => (
                <SelectItem key={e.user_id} value={e.user_id}>
                  {e.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
        <Campo id="bit-desde" etiqueta="Desde">
          <Input id="bit-desde" type="date" value={filtro.desde ?? ''} onChange={(e) => setFiltro((f) => ({ ...f, desde: e.target.value || null }))} />
        </Campo>
        <Campo id="bit-hasta" etiqueta="Hasta">
          <Input id="bit-hasta" type="date" value={filtro.hasta ?? ''} onChange={(e) => setFiltro((f) => ({ ...f, hasta: e.target.value || null }))} />
        </Campo>
      </div>

      {registros.isPending ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : registros.error ? (
        <p className="text-sm text-destructive">{mensajeError(registros.error)}</p>
      ) : filas.length === 0 ? (
        <EstadoVacio icono={History} titulo="Sin movimientos" descripcion="No hay registros con estos filtros. Prueba con otras fechas o quita un filtro." />
      ) : (
        <Card className="py-0">
          <ul className="divide-y">
            {filas.map((r) => (
              <li key={r.id} className="grid gap-1 px-4 py-3 text-sm">
                <p className="flex flex-wrap items-center gap-2">
                  <Badge variant={r.operacion === 'DELETE' ? 'outline' : 'secondary'}>{OPERACION[r.operacion] ?? r.operacion}</Badge>
                  <span className="font-medium">{TABLAS_BITACORA[r.tabla as TablaBitacora] ?? r.tabla}</span>
                  <span className="min-w-0 truncate text-muted-foreground">{resumen(r)}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {fechaHora(r.created_at)} · {nombre(r.user_id)}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {registros.hasNextPage && (
        <Button variant="outline" className="justify-self-center" onClick={() => registros.fetchNextPage()} disabled={registros.isFetchingNextPage}>
          {registros.isFetchingNextPage ? 'Cargando…' : 'Ver más'}
        </Button>
      )}
    </div>
  )
}
