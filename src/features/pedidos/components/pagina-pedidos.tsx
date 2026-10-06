import { useQuery } from '@tanstack/react-query'
import { Search, ShoppingBag } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router'
import { useEmpresaActiva } from '@/app/empresa-activa'
import { EstadoVacio } from '@/components/estado-vacio'
import { InsigniaEstado } from '@/components/insignia-estado'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { leerPedidos } from '@/features/pedidos/api'
import { FichaPedido } from '@/features/pedidos/components/ficha-pedido'
import { Semaforo } from '@/features/pedidos/components/semaforo'
import { mensajeError } from '@/lib/errores'
import { estadoPedido } from '@/lib/estados'
import { fecha, moneda } from '@/lib/formato'
import type { Enum } from '@/lib/supabase'
import { normalizar } from '@/lib/texto'
import { cn } from '@/lib/utils'

const TODOS = '__todos__'
const ABIERTOS = '__abiertos__'

function ListaPedidos() {
  const { empresa } = useEmpresaActiva()
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState<string>(ABIERTOS)
  const [extra, setExtra] = useState<string>(TODOS)
  const pedidos = useQuery({ queryKey: ['pedidos', empresa!.id], queryFn: () => leerPedidos(empresa!.id) })

  const visibles = useMemo(() => {
    const q = normalizar(busqueda.trim())
    return (pedidos.data ?? []).filter((p) => {
      if (estado === ABIERTOS && (p.estado === 'entregado' || p.estado === 'cancelado')) return false
      if (estado !== ABIERTOS && estado !== TODOS && p.estado !== estado) return false
      if (extra === 'saldo' && !(Number(p.saldo) > 0 && p.estado !== 'cancelado')) return false
      if (extra === 'atrasados' && p.semaforo !== 'atrasado') return false
      if (extra === 'sin_factura' && (p.facturado || p.estado === 'cancelado')) return false
      if (extra === 'finiquito' && !(p.estado === 'terminado' && Number(p.saldo) > 0)) return false
      if (q && !normalizar(`P-${p.folio} ${p.folio} ${p.cliente_nombre} ${p.cliente_apellidos} ${p.empresa_cliente ?? ''}`).includes(q)) return false
      return true
    })
  }, [pedidos.data, busqueda, estado, extra])

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Pedidos</h1>

      {pedidos.isPending ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : pedidos.error ? (
        <p className="text-sm text-destructive">{mensajeError(pedidos.error)}</p>
      ) : pedidos.data.length === 0 ? (
        <EstadoVacio
          icono={ShoppingBag}
          titulo="Aún no hay pedidos"
          descripcion="Los pedidos nacen de una cotización: ábrela y usa «Convertir en pedido»."
          accion="Ir a cotizaciones"
          onAccion={() => navigate('/cotizaciones')}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input type="search" placeholder="Folio o cliente" aria-label="Buscar pedido" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="pl-9" />
            </div>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger aria-label="Filtrar por estado" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ABIERTOS}>Sin entregar</SelectItem>
                <SelectItem value={TODOS}>Todos</SelectItem>
                {(Object.keys(estadoPedido) as Enum<'estado_pedido'>[]).map((e) => (
                  <SelectItem key={e} value={e}>
                    {estadoPedido[e].nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={extra} onValueChange={setExtra}>
              <SelectTrigger aria-label="Otros filtros" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Sin más filtros</SelectItem>
                <SelectItem value="saldo">Con saldo por cobrar</SelectItem>
                <SelectItem value="atrasados">Atrasados</SelectItem>
                <SelectItem value="sin_factura">Sin facturar</SelectItem>
                <SelectItem value="finiquito">Listos para finiquito</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="py-0">
            <div className="hidden grid-cols-[5rem_1fr_7rem_7rem_7rem_9rem_10rem] gap-x-4 border-b px-4 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase lg:grid">
              <span>Folio</span>
              <span>Cliente</span>
              <span className="text-right">Total</span>
              <span className="text-right">Pagado</span>
              <span className="text-right">Saldo</span>
              <span>Estado</span>
              <span>Compromiso</span>
            </div>
            <ul className="divide-y">
              {visibles.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No hay pedidos con esos filtros.</li>}
              {visibles.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/pedidos/${p.id}`}
                    className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 outline-none hover:bg-muted/40 focus-visible:bg-muted/50 lg:grid-cols-[5rem_1fr_7rem_7rem_7rem_9rem_10rem]"
                  >
                    <span className="font-medium tabular">P-{p.folio}</span>
                    <span className="col-span-2 row-start-2 min-w-0 truncate lg:col-span-1 lg:row-start-auto">
                      {p.cliente_nombre} {p.cliente_apellidos}
                      {p.empresa_cliente && <span className="text-muted-foreground"> · {p.empresa_cliente}</span>}
                    </span>
                    <span className="hidden text-right tabular lg:block">{moneda(p.total)}</span>
                    <span className="hidden text-right text-muted-foreground tabular lg:block">{moneda(p.pagado)}</span>
                    <span className={cn('col-start-2 row-start-2 text-right tabular lg:col-start-auto lg:row-start-auto', Number(p.saldo) > 0 && p.estado !== 'cancelado' ? 'font-medium' : 'text-muted-foreground')}>
                      {Number(p.saldo) > 0 ? moneda(p.saldo) : p.estado === 'cancelado' ? '—' : 'Pagado'}
                    </span>
                    <span className="col-start-2 row-start-1 justify-self-end lg:col-start-auto lg:row-start-auto lg:justify-self-start">
                      {p.estado && <InsigniaEstado tipo="pedido" estado={p.estado} />}
                    </span>
                    <span className="hidden lg:grid">
                      <span className="text-sm">{p.fecha_compromiso ? fecha(p.fecha_compromiso) : <span className="text-muted-foreground">Sin fecha</span>}</span>
                      <Semaforo semaforo={p.semaforo} dias={p.dias_para_compromiso} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  )
}

export default function PaginaPedidos() {
  return (
    <Routes>
      <Route index element={<ListaPedidos />} />
      <Route path=":id" element={<FichaPedido />} />
      <Route path="*" element={<Navigate to="/pedidos" replace />} />
    </Routes>
  )
}
