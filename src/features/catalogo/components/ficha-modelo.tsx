import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { useEmpresaActiva, usePuede, usePuedeEditar } from '@/app/empresa-activa'
import { Campo } from '@/components/campo'
import { CampoMonto } from '@/components/campo-monto'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { actualizarModelo, borrarModelo, guardarGruposModelo, type Modelo } from '@/features/catalogo/api'
import { ResultadoPrecio, SelectoresOpciones } from '@/features/catalogo/components/configurador-modelo'
import { CosteoModelo } from '@/features/catalogo/components/costeo-modelo'
import { FotoModelo } from '@/features/catalogo/components/foto-modelo'
import { borrarArchivoPublico } from '@/features/empresa/api'
import { useCategorias, useGrupos, useListas, useModelo, useRefrescarCatalogo } from '@/features/catalogo/hooks'
import { gruposDelModelo, type Seleccion } from '@/features/catalogo/use-precio'
import { mensajeError } from '@/lib/errores'
import { moneda } from '@/lib/formato'

const SIN_CATEGORIA = '__sin__'

const schema = z.object({
  nombre: z.string().trim().min(1, 'Escribe el nombre del modelo.').max(80, 'Usa como máximo 80 caracteres.'),
  categoria_id: z.string(),
  descripcion: z.string().trim().max(1000, 'Usa como máximo 1000 caracteres.'),
  sobre_diseno: z.boolean(),
  activo: z.boolean(),
  precio_base: z.number({ error: 'Escribe el precio base.' }).min(0, 'No puede ser negativo.').nullable(),
})
type Valores = z.infer<typeof schema>

const aFormulario = (m: Modelo): Valores => ({
  nombre: m.nombre,
  categoria_id: m.categoria_id ?? SIN_CATEGORIA,
  descripcion: m.descripcion ?? '',
  sobre_diseno: m.sobre_diseno,
  activo: m.activo,
  precio_base: Number(m.precio_base),
})

function Datos({ modelo, editar }: { modelo: Modelo; editar: boolean }) {
  const { empresa } = useEmpresaActiva()
  const refrescar = useRefrescarCatalogo()
  const categorias = useCategorias()
  const conPrecioBase = empresa?.metodo_precio === 'base_ajustes'
  const form = useForm<Valores>({ resolver: zodResolver(schema), defaultValues: aFormulario(modelo) })
  const { errors, isDirty } = form.formState
  const sobreDiseno = useWatch({ control: form.control, name: 'sobre_diseno' })
  useEffect(() => form.reset(aFormulario(modelo)), [modelo, form])

  const guardar = useMutation({
    mutationFn: (v: Valores) =>
      actualizarModelo(modelo.id, {
        nombre: v.nombre,
        categoria_id: v.categoria_id === SIN_CATEGORIA ? null : v.categoria_id,
        descripcion: v.descripcion || null,
        sobre_diseno: v.sobre_diseno,
        activo: v.activo,
        ...(conPrecioBase ? { precio_base: v.precio_base ?? 0 } : {}),
      }),
    onSuccess: async () => {
      await refrescar()
      toast.success('Modelo guardado')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos del modelo</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((v) => guardar.mutate(v))} noValidate className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Campo id="mod-nombre" etiqueta="Nombre" error={errors.nombre?.message}>
              <Input id="mod-nombre" disabled={!editar} aria-describedby="mod-nombre-nota" aria-invalid={!!errors.nombre} {...form.register('nombre')} />
            </Campo>
            <Campo id="mod-categoria" etiqueta="Categoría">
              <Controller
                control={form.control}
                name="categoria_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!editar}>
                    <SelectTrigger id="mod-categoria" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SIN_CATEGORIA}>Sin categoría</SelectItem>
                      {categorias.data?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Campo>
          </div>
          <Campo id="mod-descripcion" etiqueta="Descripción (opcional)" error={errors.descripcion?.message} ayuda="Aparece en la cotización debajo del nombre.">
            <Textarea id="mod-descripcion" rows={3} disabled={!editar} aria-describedby="mod-descripcion-nota" {...form.register('descripcion')} />
          </Campo>
          {conPrecioBase && !sobreDiseno && (
            <Campo id="mod-precio" etiqueta="Precio base" error={errors.precio_base?.message} ayuda="Antes de ajustes por opción y de la lista de precios." className="max-w-xs">
              {editar ? (
                <Controller
                  control={form.control}
                  name="precio_base"
                  render={({ field }) => (
                    <CampoMonto id="mod-precio" valor={field.value} onConfirmar={(v) => field.onChange(v ?? 0)} aria-describedby="mod-precio-nota" />
                  )}
                />
              ) : (
                <p className="text-lg font-medium tabular">{moneda(modelo.precio_base)}</p>
              )}
            </Campo>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="sobre_diseno"
              render={({ field }) => (
                <label className="flex items-center justify-between gap-4 rounded-xl border p-3">
                  <span className="grid gap-0.5">
                    <span className="text-sm font-medium">Sobre diseño</span>
                    <span className="text-sm text-muted-foreground">El precio se captura a mano al cotizar.</span>
                  </span>
                  <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!editar} />
                </label>
              )}
            />
            <Controller
              control={form.control}
              name="activo"
              render={({ field }) => (
                <label className="flex items-center justify-between gap-4 rounded-xl border p-3">
                  <span className="grid gap-0.5">
                    <span className="text-sm font-medium">Activo</span>
                    <span className="text-sm text-muted-foreground">Los inactivos no aparecen al cotizar.</span>
                  </span>
                  <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!editar} />
                </label>
              )}
            />
          </div>
          {editar && (
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" disabled={!isDirty || guardar.isPending} onClick={() => form.reset(aFormulario(modelo))}>
                Descartar
              </Button>
              <Button type="submit" disabled={!isDirty || guardar.isPending}>
                {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

function GruposAplicables({ modelo, editar }: { modelo: Modelo; editar: boolean }) {
  const { empresa } = useEmpresaActiva()
  const refrescar = useRefrescarCatalogo()
  const grupos = useGrupos()
  const actuales = modelo.modelo_grupos.map((m) => m.grupo_id)

  const cambiar = useMutation({
    mutationFn: (nuevos: string[]) => guardarGruposModelo(empresa!.id, modelo.id, actuales, nuevos),
    onSuccess: refrescar,
    onError: (e) => toast.error(mensajeError(e)),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Opciones que aplican</CardTitle>
        <CardDescription>Qué grupos de opciones elige el cliente para este modelo.</CardDescription>
      </CardHeader>
      <CardContent>
        {grupos.isPending ? (
          <Skeleton className="h-24" />
        ) : grupos.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay grupos de opciones.{' '}
            <Link to="/catalogo/opciones" className="font-medium text-foreground underline underline-offset-4">
              Créalos en Opciones
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {grupos.data?.map((g) => {
              const marcado = actuales.includes(g.id)
              const id = `grupo-${g.id}`
              return (
                <li key={g.id} className="flex items-start gap-3 rounded-xl border p-3">
                  <Checkbox
                    id={id}
                    checked={marcado}
                    disabled={!editar || cambiar.isPending}
                    onCheckedChange={(v) => cambiar.mutate(v ? [...actuales, g.id] : actuales.filter((x) => x !== g.id))}
                  />
                  <Label htmlFor={id} className="grid gap-0.5 font-normal">
                    <span className="font-medium">
                      {g.nombre}
                      {!g.obligatorio && <span className="font-normal text-muted-foreground"> (opcional)</span>}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {g.opciones.filter((o) => o.activo).map((o) => o.nombre).join(' · ') || 'Sin opciones'}
                    </span>
                  </Label>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function PruebaPrecio({ modelo, conCosto }: { modelo: Modelo; conCosto: boolean }) {
  const { empresa } = useEmpresaActiva()
  const grupos = useGrupos()
  const listas = useListas()
  const [seleccion, setSeleccion] = useState<Seleccion>({})
  const [listaElegida, setListaElegida] = useState<string | null>(null)
  const activas = listas.data?.filter((l) => l.activo) ?? []
  const listaId = listaElegida ?? activas.find((l) => l.predeterminada)?.id ?? null
  const gruposModelo = gruposDelModelo(grupos.data, modelo.modelo_grupos.map((m) => m.grupo_id))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prueba el precio</CardTitle>
        <CardDescription>Elige una combinación: la base calcula {conCosto ? 'el costo y el precio' : 'el precio'} con lo guardado.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <SelectoresOpciones idPrefix="prueba" grupos={gruposModelo} seleccion={seleccion} onCambiar={setSeleccion} mostrarAjuste={empresa?.metodo_precio === 'base_ajustes'} />
        <div className="grid max-w-xs gap-2">
          <Label htmlFor="prueba-lista">Lista de precios</Label>
          <Select value={listaId ?? ''} onValueChange={setListaElegida}>
            <SelectTrigger id="prueba-lista" className="w-full">
              <SelectValue placeholder="Elige una lista" />
            </SelectTrigger>
            <SelectContent>
              {activas.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ResultadoPrecio modeloId={modelo.id} grupos={gruposModelo} seleccion={seleccion} listaId={listaId} sobreDiseno={modelo.sobre_diseno} conCosto={conCosto} />
      </CardContent>
    </Card>
  )
}

export function FichaModelo() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { empresa } = useEmpresaActiva()
  const editar = usePuedeEditar('editar_catalogo')
  const verCostos = usePuede('ver_costos')
  const refrescar = useRefrescarCatalogo()
  const grupos = useGrupos()
  const modelo = useModelo(id)
  const categorias = useCategorias()
  const [borrando, setBorrando] = useState(false)

  const borrar = useMutation({
    mutationFn: async () => {
      const foto = modelo.data?.foto_path
      await borrarModelo(id)
      if (foto) await borrarArchivoPublico(foto).catch(() => undefined)
    },
    onSuccess: async () => {
      await refrescar()
      toast.success('Modelo eliminado')
      navigate('/catalogo', { replace: true })
    },
    onError: (e) => toast.error(mensajeError(e)),
  })

  if (modelo.isPending) {
    return (
      <div className="mx-auto grid w-full max-w-5xl gap-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }
  if (modelo.error || !modelo.data) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <p className="text-sm text-muted-foreground">{modelo.error ? mensajeError(modelo.error) : 'Este modelo no existe o ya fue eliminado.'}</p>
        <Button variant="link" asChild className="px-0">
          <Link to="/catalogo">Volver al catálogo</Link>
        </Button>
      </div>
    )
  }

  const m = modelo.data
  const categoria = categorias.data?.find((c) => c.id === m.categoria_id)
  const gruposModelo = gruposDelModelo(grupos.data, m.modelo_grupos.map((g) => g.grupo_id))
  const conCosteo = empresa?.metodo_precio === 'componentes' && verCostos && !m.sobre_diseno

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" asChild aria-label="Volver al catálogo">
          <Link to="/catalogo">
            <ArrowLeft aria-hidden />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{m.nombre}</h1>
          <p className="text-sm text-muted-foreground">{categoria?.nombre ?? 'Sin categoría'}</p>
        </div>
        {m.sobre_diseno && <Badge variant="secondary">Sobre diseño</Badge>}
        {!m.activo && <Badge variant="outline">Inactivo</Badge>}
        {editar && (
          <Button variant="ghost" size="icon" aria-label="Eliminar modelo" onClick={() => setBorrando(true)}>
            <Trash2 aria-hidden />
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <Datos modelo={m} editar={editar} />
        <Card>
          <CardHeader>
            <CardTitle>Foto</CardTitle>
          </CardHeader>
          <CardContent>
            <FotoModelo modeloId={m.id} nombre={m.nombre} ruta={m.foto_path} editar={editar} />
          </CardContent>
        </Card>
      </div>
      <GruposAplicables modelo={m} editar={editar} />
      {conCosteo && <CosteoModelo modeloId={m.id} grupos={gruposModelo} />}
      <PruebaPrecio modelo={m} conCosto={verCostos} />

      <AlertDialog open={borrando} onOpenChange={setBorrando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {m.nombre}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borran su costeo y su foto. Las cotizaciones y pedidos que ya lo usan conservan su descripción. Si solo quieres dejar de ofrecerlo, mejor
              desactívalo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => borrar.mutate()}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
