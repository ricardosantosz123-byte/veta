import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowDownToLine, ArrowLeft, ArrowUpFromLine, Boxes, Pencil, Plus, Scale, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router'
import { useEmpresaActiva, usePuedeEditar } from '@/app/empresa-activa'
import { EstadoVacio } from '@/components/estado-vacio'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { leerEquipo } from '@/features/cotizaciones/api'
import { leerInsumo, leerInsumos, leerMovimientos, nombreMovimiento, nombreTipo, unidad, type Insumo, type Movimiento, type TipoInsumo } from '@/features/insumos/api'
import { DialogoInsumo } from '@/features/insumos/components/dialogo-insumo'
import { DialogoMovimiento, type TipoDialogo } from '@/features/insumos/components/dialogo-movimiento'
import { mensajeError } from '@/lib/errores'
import { cantidad, fechaHora, moneda, monedaPrecisa } from '@/lib/formato'
import { normalizar } from '@/lib/texto'
import { cn } from '@/lib/utils'

function AlertaMinimo() {
  return (
    <Badge variant="outline" className="border-destructive/50 text-destructive">
      <AlertTriangle aria-hidden /> Bajo mínimo
    </Badge>
  )
}

function ListaInsumos() {
  const { empresa } = useEmpresaActiva()
  const editar = usePuedeEditar('editar_insumos')
  const navigate = useNavigate()
  const insumos = useQuery({ queryKey: ['insumos', empresa!.id, 'lista'], queryFn: () => leerInsumos(empresa!.id) })
  const [busqueda, setBusqueda] = useState('')
  const [soloBajos, setSoloBajos] = useState(false)
  const [inactivos, setInactivos] = useState(false)
  const [nuevo, setNuevo] = useState(false)

  const activos = useMemo(() => (insumos.data ?? []).filter((i) => i.activo), [insumos.data])
  const bajos = activos.filter((i) => i.bajo_minimo).length
  const visibles = useMemo(() => {
    const q = normalizar(busqueda.trim())
    return (insumos.data ?? []).filter(
      (i) =>
        (inactivos || i.activo) &&
        (!soloBajos || (i.activo && i.bajo_minimo)) &&
        (!q || normalizar(`${i.nombre} ${i.proveedor ?? ''} ${nombreTipo[i.tipo as TipoInsumo] ?? ''}`).includes(q)),
    )
  }, [insumos.data, busqueda, soloBajos, inactivos])

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-2xl font-semibold tracking-tight">Insumos</h1>
        {editar && (
          <Button onClick={() => setNuevo(true)}>
            <Plus aria-hidden /> Nuevo insumo
          </Button>
        )}
      </div>

      {insumos.isPending ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : insumos.error ? (
        <p className="text-sm text-destructive">{mensajeError(insumos.error)}</p>
      ) : insumos.data.length === 0 ? (
        <EstadoVacio
          icono={Boxes}
          titulo="Aún no hay insumos"
          descripcion="Lleva existencias de madera, tela, espuma y herrajes, con su costo promedio y alertas bajo el mínimo."
          accion={editar ? 'Agrega tu primer insumo' : undefined}
          onAccion={() => setNuevo(true)}
        />
      ) : (
        <>
          {bajos > 0 && (
            <button
              type="button"
              onClick={() => setSoloBajos((v) => !v)}
              aria-pressed={soloBajos}
              className="flex min-h-11 items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2 text-left text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden />
              <span className="flex-1">
                <strong>{bajos === 1 ? '1 insumo está' : `${bajos} insumos están`} bajo el mínimo.</strong> Conviene reponer.
              </span>
              <span className="font-medium underline underline-offset-4">{soloBajos ? 'Ver todos' : 'Ver solo esos'}</span>
            </button>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input type="search" placeholder="Buscar por nombre, tipo o proveedor" aria-label="Buscar insumo" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="pl-9" />
            </div>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <Switch checked={inactivos} onCheckedChange={setInactivos} />
              Mostrar inactivos
            </label>
          </div>
          <Card className="py-0">
            <ul className="divide-y">
              {visibles.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Sin resultados.</li>}
              {visibles.map((i) => (
                <li key={i.id}>
                  <Link to={`/insumos/${i.id}`} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        <span className="truncate">{i.nombre}</span>
                        {!i.activo && <Badge variant="outline">Inactivo</Badge>}
                        {i.activo && i.bajo_minimo && <AlertaMinimo />}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {[nombreTipo[i.tipo as TipoInsumo], i.proveedor, Number(i.minimo) > 0 && `mínimo ${cantidad(i.minimo)} ${unidad(i.unidad)}`].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <dl className="flex gap-6 text-right text-sm">
                      <div>
                        <dt className="text-muted-foreground">Existencia</dt>
                        <dd className={cn('font-medium tabular', i.activo && i.bajo_minimo && 'text-destructive')}>
                          {cantidad(i.existencia)} {unidad(i.unidad)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Costo prom.</dt>
                        <dd className="tabular">{monedaPrecisa(i.costo_unitario)}</dd>
                      </div>
                      <div className="hidden sm:block">
                        <dt className="text-muted-foreground">Valor</dt>
                        <dd className="tabular">{moneda(i.valor_existencia)}</dd>
                      </div>
                    </dl>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <p className="text-xs text-muted-foreground">
            <strong>Costo prom.</strong>: costo promedio ponderado de las entradas. <strong>Valor</strong>: existencia × costo promedio.
          </p>
        </>
      )}
      {nuevo && <DialogoInsumo insumo={null} onCerrar={() => setNuevo(false)} onCreado={(id) => navigate(`/insumos/${id}`)} />}
    </div>
  )
}

function DescripcionMovimiento({ m }: { m: Movimiento }) {
  const partes = [
    m.orden_folio !== null && `Orden O-${m.orden_folio}`,
    m.destajista && `entregado a ${m.destajista}`,
    m.nota,
  ].filter(Boolean)
  return partes.length ? <span className="block text-sm text-muted-foreground">{partes.join(' · ')}</span> : null
}

function FichaInsumo() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { empresa } = useEmpresaActiva()
  const editar = usePuedeEditar('editar_insumos')
  const insumo = useQuery({ queryKey: ['insumos', empresa!.id, id], queryFn: () => leerInsumo(id) })
  const movimientos = useQuery({ queryKey: ['insumos', empresa!.id, id, 'movimientos'], queryFn: () => leerMovimientos(id) })
  const equipo = useQuery({ queryKey: ['equipo', empresa!.id], queryFn: () => leerEquipo(empresa!.id), staleTime: 5 * 60_000 })
  const [editando, setEditando] = useState(false)
  const [movimiento, setMovimiento] = useState<TipoDialogo | null>(null)

  if (insumo.isPending) return <Skeleton className="mx-auto h-64 w-full max-w-5xl rounded-xl" />
  if (insumo.error || !insumo.data)
    return (
      <div className="mx-auto w-full max-w-5xl text-sm text-muted-foreground">
        {insumo.error ? mensajeError(insumo.error) : 'Este insumo no existe.'}{' '}
        <Link to="/insumos" className="underline">
          Volver
        </Link>
      </div>
    )

  const i: Insumo = insumo.data
  const u = unidad(i.unidad)
  const nombreDe = (userId: string | null) => (userId && equipo.data?.find((e) => e.user_id === userId)?.nombre) || null

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" asChild aria-label="Volver a insumos">
          <Link to="/insumos">
            <ArrowLeft aria-hidden />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
            <span className="truncate">{i.nombre}</span>
            {!i.activo && <Badge variant="outline">Inactivo</Badge>}
            {i.activo && i.bajo_minimo && <AlertaMinimo />}
          </h1>
          <p className="text-sm text-muted-foreground">{[nombreTipo[i.tipo as TipoInsumo], i.proveedor].filter(Boolean).join(' · ')}</p>
        </div>
        {editar && (
          <Button variant="outline" onClick={() => setEditando(true)}>
            <Pencil aria-hidden /> Editar
          </Button>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { t: 'Existencia', v: `${cantidad(i.existencia)} ${u}`, alerta: i.activo && i.bajo_minimo },
          { t: 'Mínimo', v: Number(i.minimo) > 0 ? `${cantidad(i.minimo)} ${u}` : 'Sin alerta' },
          { t: 'Costo promedio', v: `${monedaPrecisa(i.costo_unitario)} / ${u}` },
          { t: 'Valor en almacén', v: moneda(i.valor_existencia) },
        ].map((x) => (
          <div key={x.t} className="rounded-xl border p-4">
            <dt className="text-sm text-muted-foreground">{x.t}</dt>
            <dd className={cn('text-xl font-semibold tracking-tight tabular', x.alerta && 'text-destructive')}>{x.v}</dd>
          </div>
        ))}
      </dl>

      {editar && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setMovimiento('entrada')} disabled={!i.activo}>
            <ArrowDownToLine aria-hidden /> Entrada
          </Button>
          <Button variant="outline" onClick={() => setMovimiento('salida')} disabled={!i.activo}>
            <ArrowUpFromLine aria-hidden /> Salida
          </Button>
          <Button variant="outline" onClick={() => setMovimiento('ajuste')} disabled={!i.activo}>
            <Scale aria-hidden /> Ajuste por conteo
          </Button>
          {!i.activo && <p className="self-center text-sm text-muted-foreground">Insumo inactivo: actívalo en Editar para registrar movimientos.</p>}
        </div>
      )}

      <section className="grid gap-3" aria-labelledby="ins-historial">
        <h2 id="ins-historial" className="font-medium">
          Historial de movimientos
        </h2>
        {movimientos.isPending ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : movimientos.error ? (
          <p className="text-sm text-destructive">{mensajeError(movimientos.error)}</p>
        ) : movimientos.data.length === 0 ? (
          <EstadoVacio
            icono={ArrowDownToLine}
            titulo="Sin movimientos todavía"
            descripcion="Registra la primera entrada con su costo para tener existencia y costo promedio."
            accion={editar && i.activo ? 'Registrar entrada' : undefined}
            onAccion={() => setMovimiento('entrada')}
          />
        ) : (
          <Card className="py-0">
            <ul className="divide-y">
              {movimientos.data.map((m) => {
                const efecto = Number(m.efecto)
                const quien = nombreDe(m.created_by)
                return (
                  <li key={m.id} className="flex flex-wrap items-start gap-x-6 gap-y-1 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        <Badge variant={m.tipo === 'entrada' ? 'secondary' : 'outline'}>{nombreMovimiento[m.tipo!]}</Badge>
                        <span className="tabular">
                          {efecto > 0 ? '+' : '−'}
                          {cantidad(Math.abs(efecto))} {u}
                        </span>
                      </p>
                      <DescripcionMovimiento m={m} />
                      <span className="block text-xs text-muted-foreground">
                        {fechaHora(m.created_at)}
                        {quien && ` · ${quien}`}
                      </span>
                    </div>
                    <dl className="flex gap-6 text-right text-sm">
                      <div>
                        <dt className="text-muted-foreground">{m.tipo === 'entrada' ? 'Costo' : 'Al costo'}</dt>
                        <dd className="tabular">{monedaPrecisa(m.costo_unitario)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Valor</dt>
                        <dd className="tabular">{moneda(m.valor)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Queda</dt>
                        <dd className="font-medium tabular">
                          {cantidad(m.existencia_despues)} {u}
                        </dd>
                      </div>
                    </dl>
                  </li>
                )
              })}
            </ul>
          </Card>
        )}
      </section>

      {editando && <DialogoInsumo insumo={i} onCerrar={() => setEditando(false)} onBorrado={() => navigate('/insumos')} />}
      {movimiento && <DialogoMovimiento key={movimiento} tipo={movimiento} insumo={i} onCerrar={() => setMovimiento(null)} />}
    </div>
  )
}

export default function PaginaInsumos() {
  return (
    <Routes>
      <Route index element={<ListaInsumos />} />
      <Route path=":id" element={<FichaInsumo />} />
      <Route path="*" element={<Navigate to="/insumos" replace />} />
    </Routes>
  )
}
