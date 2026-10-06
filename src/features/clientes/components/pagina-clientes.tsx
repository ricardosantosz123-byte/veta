import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, FilePlus2, Mail, MapPin, MessageCircle, Pencil, Phone, Plus, ReceiptText, Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router'
import { useEmpresaActiva, usePuedeEditar } from '@/app/empresa-activa'
import { EstadoVacio } from '@/components/estado-vacio'
import { InsigniaEstado } from '@/components/insignia-estado'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { leerCliente, leerClientes, leerHistorial, nombreCompleto } from '@/features/clientes/api'
import { DialogoCliente } from '@/features/clientes/components/dialogo-cliente'
import { EstadoCuenta } from '@/features/pedidos/components/estado-cuenta'
import { mensajeError } from '@/lib/errores'
import { fecha, moneda } from '@/lib/formato'
import { normalizar } from '@/lib/texto'
import { telefonoLegible } from '@/lib/telefono'
import { enlaceWhatsApp } from '@/lib/whatsapp'

function ListaClientes() {
  const { empresa } = useEmpresaActiva()
  const editar = usePuedeEditar('editar_clientes')
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [nuevo, setNuevo] = useState(false)
  const clientes = useQuery({ queryKey: ['clientes', empresa!.id], queryFn: () => leerClientes(empresa!.id) })

  const visibles = useMemo(() => {
    const q = normalizar(busqueda.trim())
    const digitos = busqueda.replace(/\D/g, '')
    if (!q) return clientes.data ?? []
    return (clientes.data ?? []).filter(
      (c) =>
        normalizar(`${c.nombre} ${c.apellidos} ${c.empresa_cliente ?? ''} ${c.email ?? ''}`).includes(q) ||
        (digitos.length >= 4 && (c.telefono ?? '').includes(digitos)),
    )
  }, [clientes.data, busqueda])

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-2xl font-semibold tracking-tight">Clientes</h1>
        {editar && (
          <Button onClick={() => setNuevo(true)}>
            <Plus aria-hidden /> Nuevo cliente
          </Button>
        )}
      </div>

      {clientes.isPending ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : clientes.error ? (
        <p className="text-sm text-destructive">{mensajeError(clientes.error)}</p>
      ) : clientes.data.length === 0 ? (
        <EstadoVacio
          icono={Users}
          titulo="Aún no hay clientes"
          descripcion="Registra a tus clientes para cotizarles y ver su historial y saldo."
          accion={editar ? 'Agrega tu primer cliente' : undefined}
          onAccion={() => setNuevo(true)}
        />
      ) : (
        <>
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input type="search" placeholder="Buscar por nombre, empresa o teléfono" aria-label="Buscar cliente" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="pl-9" />
          </div>
          <Card className="py-0">
            <ul className="divide-y">
              {visibles.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Sin resultados.</li>}
              {visibles.map((c) => (
                <li key={c.id}>
                  <Link to={`/clientes/${c.id}`} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{nombreCompleto({ nombre: c.nombre ?? '', apellidos: c.apellidos })}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {[c.empresa_cliente, c.telefono && telefonoLegible(c.telefono)].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground tabular">
                      {c.cotizaciones} cot. · {c.pedidos} ped.
                    </span>
                    <span className={Number(c.saldo) > 0 ? 'w-28 text-right font-medium tabular' : 'w-28 text-right text-muted-foreground tabular'}>
                      {Number(c.saldo) > 0 ? moneda(c.saldo) : 'Sin saldo'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      {nuevo && <DialogoCliente abierto onCerrar={() => setNuevo(false)} nombreInicial={busqueda} onGuardado={(c) => navigate(`/clientes/${c.id}`)} />}
    </div>
  )
}

function FichaCliente() {
  const { id = '' } = useParams()
  const { empresa } = useEmpresaActiva()
  const editar = usePuedeEditar('editar_clientes')
  const cotizar = usePuedeEditar('editar_cotizaciones')
  const [editando, setEditando] = useState(false)
  const cliente = useQuery({ queryKey: ['clientes', empresa!.id, id], queryFn: () => leerCliente(id) })
  const historial = useQuery({ queryKey: ['clientes', empresa!.id, id, 'historial'], queryFn: () => leerHistorial(id) })

  if (cliente.isPending) return <Skeleton className="mx-auto h-64 w-full max-w-5xl rounded-xl" />
  if (cliente.error || !cliente.data)
    return (
      <div className="mx-auto w-full max-w-5xl text-sm text-muted-foreground">
        {cliente.error ? mensajeError(cliente.error) : 'Este cliente no existe.'}{' '}
        <Link to="/clientes" className="underline">
          Volver
        </Link>
      </div>
    )

  const c = cliente.data
  const nombre = nombreCompleto({ nombre: c.nombre ?? '', apellidos: c.apellidos })

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" asChild aria-label="Volver a clientes">
          <Link to="/clientes">
            <ArrowLeft aria-hidden />
          </Link>
        </Button>
        <div className="min-w-0 flex-1 basis-56">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{nombre}</h1>
          {c.empresa_cliente && <p className="text-sm text-muted-foreground">{c.empresa_cliente}</p>}
        </div>
        <Button variant="outline" asChild>
          <Link to={`/clientes/${c.id}/estado-de-cuenta`}>
            <ReceiptText aria-hidden /> Estado de cuenta
          </Link>
        </Button>
        {editar && (
          <Button variant="outline" onClick={() => setEditando(true)}>
            <Pencil aria-hidden /> Editar
          </Button>
        )}
        {cotizar && (
          <Button asChild>
            <Link to={`/cotizaciones/nueva?cliente=${c.id}`}>
              <FilePlus2 aria-hidden /> Cotizar
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <Card>
          <CardContent className="grid gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Saldo pendiente</p>
              <p className="text-2xl font-semibold tabular">{moneda(c.saldo)}</p>
            </div>
            <ul className="grid gap-2">
              <li className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" aria-hidden />
                {c.telefono ? (
                  <>
                    <a href={`tel:+${c.telefono}`} className="underline-offset-4 hover:underline">
                      {telefonoLegible(c.telefono)}
                    </a>
                    <a href={enlaceWhatsApp('', c.telefono)} target="_blank" rel="noreferrer" aria-label="Abrir WhatsApp" className="ml-auto text-muted-foreground hover:text-foreground">
                      <MessageCircle className="size-4" aria-hidden />
                    </a>
                  </>
                ) : (
                  <span className="text-muted-foreground">Sin teléfono</span>
                )}
              </li>
              <li className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" aria-hidden />
                {c.email ? <a href={`mailto:${c.email}`} className="truncate underline-offset-4 hover:underline">{c.email}</a> : <span className="text-muted-foreground">Sin correo</span>}
              </li>
              {c.direccion && (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="whitespace-pre-line">{c.direccion}</span>
                </li>
              )}
            </ul>
            {c.notas && <p className="rounded-lg bg-muted/50 p-3 whitespace-pre-line text-muted-foreground">{c.notas}</p>}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Cotizaciones</CardTitle>
            </CardHeader>
            <CardContent>
              {historial.isPending ? (
                <Skeleton className="h-20" />
              ) : historial.data?.cotizaciones.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin cotizaciones.</p>
              ) : (
                <ul className="divide-y">
                  {historial.data?.cotizaciones.map((q) => (
                    <li key={q.id}>
                      <Link to={`/cotizaciones/${q.id}`} className="flex items-center gap-3 py-2.5 hover:underline-offset-4">
                        <span className="w-16 font-medium tabular">C-{q.folio}</span>
                        <span className="flex-1 text-sm text-muted-foreground">{fecha(q.fecha)}</span>
                        {q.estado_efectivo && <InsigniaEstado tipo="cotizacion" estado={q.estado_efectivo} />}
                        <span className="w-28 text-right tabular">{moneda(q.total)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pedidos</CardTitle>
            </CardHeader>
            <CardContent>
              {historial.isPending ? (
                <Skeleton className="h-20" />
              ) : historial.data?.pedidos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin pedidos.</p>
              ) : (
                <ul className="divide-y">
                  {historial.data?.pedidos.map((p) => (
                    <li key={p.id}>
                      <Link to={`/pedidos/${p.id}`} className="flex items-center gap-3 py-2.5">
                      <span className="w-16 font-medium tabular">P-{p.folio}</span>
                      <span className="flex-1 text-sm text-muted-foreground">{fecha(p.created_at)}</span>
                      <InsigniaEstado tipo="pedido" estado={p.estado} />
                      <span className="w-28 text-right text-sm tabular">
                        {Number(p.saldo) > 0 ? `Debe ${moneda(p.saldo)}` : 'Pagado'}
                      </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {editando && <DialogoCliente abierto cliente={c} onCerrar={() => setEditando(false)} />}
    </div>
  )
}

export default function PaginaClientes() {
  return (
    <Routes>
      <Route index element={<ListaClientes />} />
      <Route path=":id" element={<FichaCliente />} />
      <Route path=":id/estado-de-cuenta" element={<EstadoCuenta />} />
      <Route path="*" element={<Navigate to="/clientes" replace />} />
    </Routes>
  )
}
