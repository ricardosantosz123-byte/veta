import { useQuery } from '@tanstack/react-query'
import { CalendarCheck } from 'lucide-react'
import { useState } from 'react'
import { useEmpresaActiva, usePuedeEditar } from '@/app/empresa-activa'
import { EstadoVacio } from '@/components/estado-vacio'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { leerPorProgramar } from '@/features/produccion/api'
import { DialogoMandarProduccion } from '@/features/produccion/components/dialogo-mandar-produccion'
import { Semaforo } from '@/features/pedidos/components/semaforo'
import { mensajeError } from '@/lib/errores'
import { diasDesdeHoy, fecha } from '@/lib/formato'

/** Pedidos con renglones sin órdenes. Producción no ve clientes: solo folio, fechas y muebles. */
export function PorProgramar() {
  const { empresa } = useEmpresaActiva()
  const gestionar = usePuedeEditar('gestionar_produccion')
  const pedidos = useQuery({ queryKey: ['produccion', empresa!.id, 'por-programar'], queryFn: () => leerPorProgramar(empresa!.id) })
  const [abierto, setAbierto] = useState<{ id: string; folio: number | null; fecha_compromiso: string | null } | null>(null)

  if (pedidos.isPending) return <Skeleton className="h-64 rounded-xl" />
  if (pedidos.error) return <p className="text-sm text-destructive">{mensajeError(pedidos.error)}</p>

  // Un renglón está programado si tiene al menos una orden no cancelada.
  const pendientes = pedidos.data
    .map((p) => ({ ...p, sinOrden: p.pedido_items.filter((i) => !i.ordenes_produccion.some((o) => o.estado !== 'cancelada')) }))
    .filter((p) => p.sinOrden.length > 0)

  if (pendientes.length === 0)
    return <EstadoVacio icono={CalendarCheck} titulo="Todo está programado" descripcion="Cuando Ventas convierta una cotización en pedido, aparecerá aquí para mandarla a producción." />

  return (
    <div className="grid gap-3">
      {pendientes.map((p) => {
        const d = diasDesdeHoy(p.fecha_compromiso)
        const semaforo = d === null ? null : d < 0 ? 'atrasado' : d <= 3 ? 'por_vencer' : 'a_tiempo'
        return (
          <Card key={p.id} className="py-4">
            <CardContent className="flex flex-wrap items-start gap-4 px-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium tabular">Pedido P-{p.folio}</span>
                  {p.estado === 'anticipo_pendiente' ? (
                    p.inicio_autorizado_at ? <Badge variant="secondary">Inicio autorizado sin anticipo</Badge> : <Badge variant="outline">Espera anticipo</Badge>
                  ) : (
                    <Badge variant="secondary">Anticipo cubierto</Badge>
                  )}
                </div>
                <ul className="mt-1 text-sm text-muted-foreground">
                  {p.sinOrden.map((i) => (
                    <li key={i.id}>
                      {i.cantidad} × {i.descripcion}
                      {i.opciones_texto && ` · ${i.opciones_texto}`}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid justify-items-end gap-1 text-sm">
                <span>{p.fecha_compromiso ? `Entrega ${fecha(p.fecha_compromiso)}` : 'Sin fecha compromiso'}</span>
                <Semaforo semaforo={semaforo} dias={d} />
                {gestionar && (
                  <Button size="sm" className="mt-1" onClick={() => setAbierto({ id: p.id, folio: p.folio, fecha_compromiso: p.fecha_compromiso })}>
                    Mandar a producción
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
      {abierto && <DialogoMandarProduccion abierto pedido={abierto} onCerrar={() => setAbierto(null)} />}
    </div>
  )
}
