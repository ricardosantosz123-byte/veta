import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, FileText, MoreHorizontal, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { useEmpresaActiva, usePuedeEditar } from '@/app/empresa-activa'
import { EstadoVacio } from '@/components/estado-vacio'
import { InsigniaEstado } from '@/components/insignia-estado'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/auth-provider'
import { useListas } from '@/features/catalogo/hooks'
import { BuscadorCliente } from '@/features/clientes/components/buscador-cliente'
import { crearCotizacion, duplicarCotizacion, leerCotizaciones, leerEquipo } from '@/features/cotizaciones/api'
import { EditorCotizacion } from '@/features/cotizaciones/components/editor-cotizacion'
import { mensajeError } from '@/lib/errores'
import { estadoCotizacion } from '@/lib/estados'
import { diasDesdeHoy, fecha, moneda } from '@/lib/formato'
import type { Enum } from '@/lib/supabase'
import { normalizar } from '@/lib/texto'

const TODOS = '__todos__'
function ListaCotizaciones() {
  const { empresa } = useEmpresaActiva()
  const { user } = useAuth()
  const editar = usePuedeEditar('editar_cotizaciones')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState<string>(TODOS)
  const [vence, setVence] = useState<string>(TODOS)
  const [vendedor, setVendedor] = useState<string>(TODOS)

  const cotizaciones = useQuery({ queryKey: ['cotizaciones', empresa!.id], queryFn: () => leerCotizaciones(empresa!.id) })
  const equipo = useQuery({ queryKey: ['equipo', empresa!.id], queryFn: () => leerEquipo(empresa!.id), staleTime: 5 * 60_000 })
  const nombreDe = (uid: string | null) => equipo.data?.find((m) => m.user_id === uid)?.nombre ?? '—'

  const duplicar = useMutation({
    mutationFn: duplicarCotizacion,
    onSuccess: async (nueva) => {
      await queryClient.invalidateQueries({ queryKey: ['cotizaciones', empresa!.id] })
      toast.success('Cotización duplicada')
      navigate(`/cotizaciones/${nueva}`)
    },
    onError: (e) => toast.error(mensajeError(e)),
  })

  const visibles = useMemo(() => {
    const q = normalizar(busqueda.trim())
    return (cotizaciones.data ?? []).filter((c) => {
      if (estado !== TODOS && c.estado_efectivo !== estado) return false
      if (vendedor !== TODOS && c.vendedor_id !== (vendedor === 'yo' ? user?.id : vendedor)) return false
      if (vence !== TODOS) {
        const d = diasDesdeHoy(c.vigencia_hasta)
        const abierta = c.estado === 'borrador' || c.estado === 'enviada'
        if (vence === 'semana' && !(abierta && d !== null && d >= 0 && d <= 7)) return false
        if (vence === 'vencidas' && c.estado_efectivo !== 'vencida') return false
      }
      if (q && !normalizar(`C-${c.folio} ${c.folio} ${c.cliente_nombre} ${c.cliente_apellidos} ${c.empresa_cliente ?? ''}`).includes(q)) return false
      return true
    })
  }, [cotizaciones.data, busqueda, estado, vence, vendedor, user])

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-2xl font-semibold tracking-tight">Cotizaciones</h1>
        {editar && (
          <Button asChild>
            <Link to="/cotizaciones/nueva">
              <Plus aria-hidden /> Nueva cotización
            </Link>
          </Button>
        )}
      </div>

      {cotizaciones.isPending ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : cotizaciones.error ? (
        <p className="text-sm text-destructive">{mensajeError(cotizaciones.error)}</p>
      ) : cotizaciones.data.length === 0 ? (
        <EstadoVacio
          icono={FileText}
          titulo="Aún no hay cotizaciones"
          descripcion="Cotiza en minutos con tu lista de precios y envíala por WhatsApp o correo."
          accion={editar ? 'Crea tu primera cotización' : undefined}
          onAccion={() => navigate('/cotizaciones/nueva')}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input type="search" placeholder="Folio o cliente" aria-label="Buscar cotización" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="pl-9" />
            </div>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger aria-label="Filtrar por estado" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos los estados</SelectItem>
                {(Object.keys(estadoCotizacion) as Enum<'estado_cotizacion'>[]).map((e) => (
                  <SelectItem key={e} value={e}>
                    {estadoCotizacion[e].nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={vence} onValueChange={setVence}>
              <SelectTrigger aria-label="Filtrar por vencimiento" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Cualquier vigencia</SelectItem>
                <SelectItem value="semana">Vencen en 7 días</SelectItem>
                <SelectItem value="vencidas">Ya vencidas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={vendedor} onValueChange={setVendedor}>
              <SelectTrigger aria-label="Filtrar por vendedor" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos los vendedores</SelectItem>
                <SelectItem value="yo">Mis cotizaciones</SelectItem>
                {equipo.data
                  ?.filter((m) => m.user_id !== user?.id && ['admin', 'vendedor'].includes(m.rol))
                  .map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.nombre}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="py-0">
            <div className="hidden grid-cols-[5rem_1fr_7rem_8rem_8rem_7rem_8rem_2.5rem] gap-x-4 border-b px-4 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase lg:grid">
              <span>Folio</span>
              <span>Cliente</span>
              <span>Fecha</span>
              <span>Vigencia</span>
              <span>Vendedor</span>
              <span>Estado</span>
              <span className="text-right">Total</span>
              <span />
            </div>
            <ul className="divide-y">
              {visibles.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No hay cotizaciones con esos filtros.</li>}
              {visibles.map((c) => {
                const d = diasDesdeHoy(c.vigencia_hasta)
                const porVencer = (c.estado === 'borrador' || c.estado === 'enviada') && d !== null && d >= 0 && d <= 3
                return (
                  <li key={c.id} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-muted/40 lg:grid-cols-[5rem_1fr_7rem_8rem_8rem_7rem_8rem_2.5rem]">
                    <Link to={`/cotizaciones/${c.id}`} className="font-medium tabular outline-none focus-visible:underline">
                      C-{c.folio}
                    </Link>
                    <Link to={`/cotizaciones/${c.id}`} className="col-span-2 row-start-2 min-w-0 truncate lg:col-span-1 lg:row-start-auto">
                      {c.cliente_nombre} {c.cliente_apellidos}
                      {c.empresa_cliente && <span className="text-muted-foreground"> · {c.empresa_cliente}</span>}
                    </Link>
                    <span className="hidden text-sm text-muted-foreground lg:block">{fecha(c.fecha)}</span>
                    <span className={porVencer ? 'hidden text-sm font-medium text-aviso lg:block' : 'hidden text-sm text-muted-foreground lg:block'}>
                      {fecha(c.vigencia_hasta)}
                    </span>
                    <span className="hidden truncate text-sm text-muted-foreground lg:block">{nombreDe(c.vendedor_id)}</span>
                    <span className="col-start-2 row-start-1 justify-self-end lg:col-start-auto lg:row-start-auto lg:justify-self-start">
                      {c.estado_efectivo && <InsigniaEstado tipo="cotizacion" estado={c.estado_efectivo} />}
                    </span>
                    <span className="col-start-2 row-start-2 text-right font-medium tabular lg:col-start-auto lg:row-start-auto">{moneda(c.total)}</span>
                    <span className="hidden justify-end lg:flex">
                      {editar && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Acciones para C-${c.folio}`}>
                              <MoreHorizontal aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => duplicar.mutate(c.id!)}>
                              <Copy aria-hidden /> Duplicar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          </Card>
        </>
      )}
    </div>
  )
}

function NuevaCotizacion() {
  const { empresa } = useEmpresaActiva()
  const editar = usePuedeEditar('editar_cotizaciones')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const [cliente, setCliente] = useState<string | null>(params.get('cliente'))
  const listas = useListas()
  const predeterminada = listas.data?.find((l) => l.predeterminada && l.activo)?.id ?? listas.data?.find((l) => l.activo)?.id ?? null

  const crear = useMutation({
    mutationFn: () => crearCotizacion(empresa!.id, cliente!, predeterminada),
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: ['cotizaciones', empresa!.id] })
      navigate(`/cotizaciones/${id}`, { replace: true })
    },
  })

  if (!editar) return <Navigate to="/cotizaciones" replace />

  return (
    <div className="mx-auto w-full max-w-lg pt-6">
      <Card>
        <CardHeader>
          <CardTitle>Nueva cotización</CardTitle>
          <CardDescription>¿Para quién es? Después agregas los muebles; todo se guarda solo.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Label htmlFor="nueva-cliente">Cliente</Label>
          <BuscadorCliente id="nueva-cliente" valor={cliente} onCambiar={setCliente} />
          {crear.isError && (
            <p role="alert" className="text-sm text-destructive">
              {mensajeError(crear.error)}
            </p>
          )}
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="ghost" asChild>
            <Link to="/cotizaciones">Cancelar</Link>
          </Button>
          <Button onClick={() => crear.mutate()} disabled={!cliente || crear.isPending || listas.isPending}>
            {crear.isPending ? 'Creando…' : 'Crear cotización'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function PaginaCotizaciones() {
  return (
    <Routes>
      <Route index element={<ListaCotizaciones />} />
      <Route path="nueva" element={<NuevaCotizacion />} />
      <Route path=":id" element={<EditorCotizacion />} />
      <Route path="*" element={<Navigate to="/cotizaciones" replace />} />
    </Routes>
  )
}
