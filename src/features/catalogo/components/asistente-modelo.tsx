import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, Check, ImagePlus, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useEmpresaActiva, usePuedeEditar } from '@/app/empresa-activa'
import { SinAcceso } from '@/app/guardias'
import { Campo } from '@/components/campo'
import { CampoMonto } from '@/components/campo-monto'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  actualizarModelo,
  crearCategoria,
  crearGrupo,
  crearModelo,
  crearOpciones,
  guardarCosto,
  guardarGruposModelo,
  guardarMarkup,
  subirFotoModelo,
} from '@/features/catalogo/api'
import { useCategorias, useEtapas, useGrupos, useRefrescarCatalogo } from '@/features/catalogo/hooks'
import { LOGO_TIPOS, validarImagen } from '@/features/empresa/api'
import { mensajeError } from '@/lib/errores'
import { cn } from '@/lib/utils'

const PASOS = ['El mueble', 'Sus opciones', 'Su precio'] as const
const NUEVA = '__nueva__'
const SIN = '__sin__'

function NuevoGrupo({ alCrear }: { alCrear: (id: string) => void }) {
  const { empresa } = useEmpresaActiva()
  const refrescar = useRefrescarCatalogo()
  const grupos = useGrupos()
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [opciones, setOpciones] = useState('')
  const crear = useMutation({
    mutationFn: async () => {
      const lista = [...new Set(opciones.split(/[\n,]/).map((t) => t.trim()).filter(Boolean))]
      if (!nombre.trim()) throw new Error('Escribe el nombre del grupo.')
      if (lista.length === 0) throw new Error('Escribe al menos una opción.')
      const id = await crearGrupo(empresa!.id, nombre.trim(), true, (grupos.data?.length ?? 0) + 1)
      await crearOpciones(empresa!.id, id, lista, 1)
      return id
    },
    onSuccess: async (id) => {
      await refrescar()
      alCrear(id)
      setNombre('')
      setOpciones('')
      setAbierto(false)
    },
  })

  if (!abierto) {
    return (
      <Button type="button" variant="outline" onClick={() => setAbierto(true)}>
        <Plus aria-hidden /> Crear un grupo nuevo
      </Button>
    )
  }
  return (
    <div className="grid gap-3 rounded-xl border p-4">
      <Campo id="ng-nombre" etiqueta="Nombre del grupo">
        <Input id="ng-nombre" autoFocus placeholder="Madera" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </Campo>
      <Campo id="ng-opciones" etiqueta="Opciones" ayuda="Una por línea o separadas por comas.">
        <Textarea id="ng-opciones" rows={3} placeholder="Encino, Nogal, Parota" value={opciones} onChange={(e) => setOpciones(e.target.value)} aria-describedby="ng-opciones-nota" />
      </Campo>
      {crear.isError && (
        <p role="alert" className="text-sm text-destructive">
          {mensajeError(crear.error)}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
        <Button type="button" onClick={() => crear.mutate()} disabled={crear.isPending}>
          {crear.isPending ? 'Creando…' : 'Crear grupo'}
        </Button>
      </div>
    </div>
  )
}

export function AsistenteModelo() {
  const { empresa } = useEmpresaActiva()
  const editar = usePuedeEditar('editar_catalogo')
  const navigate = useNavigate()
  const refrescar = useRefrescarCatalogo()
  const categorias = useCategorias()
  const grupos = useGrupos()
  const etapas = useEtapas()
  const componentes = empresa?.metodo_precio === 'componentes'

  const [paso, setPaso] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState<string>(SIN)
  const [categoriaNueva, setCategoriaNueva] = useState('')
  const [sobreDiseno, setSobreDiseno] = useState(false)
  const [foto, setFoto] = useState<File | null>(null)
  const [elegidos, setElegidos] = useState<string[]>([])
  const [costos, setCostos] = useState<Record<string, number | null>>({})
  const [markupPct, setMarkupPct] = useState<number | null>(100)
  const [precioBase, setPrecioBase] = useState<number | null>(null)

  const crear = useMutation({
    mutationFn: async () => {
      const e = empresa!.id
      let categoria_id: string | null = null
      if (categoria === NUEVA) categoria_id = await crearCategoria(e, categoriaNueva.trim(), (categorias.data?.length ?? 0) + 1)
      else if (categoria !== SIN) categoria_id = categoria

      const id = await crearModelo(e, {
        nombre: nombre.trim(),
        categoria_id,
        sobre_diseno: sobreDiseno,
        ...(!componentes && !sobreDiseno ? { precio_base: precioBase ?? 0 } : {}),
      })
      // A partir de aquí el modelo existe: lo que falle se puede completar en su ficha.
      const avisos: string[] = []
      const intentar = async (que: string, f: () => Promise<unknown>) => {
        try {
          await f()
        } catch (err) {
          avisos.push(`${que}: ${mensajeError(err)}`)
        }
      }
      if (foto) await intentar('Foto', async () => actualizarModelo(id, { foto_path: await subirFotoModelo(e, id, foto) }))
      if (elegidos.length) await intentar('Opciones', () => guardarGruposModelo(e, id, [], elegidos))
      if (componentes && !sobreDiseno) {
        for (const [etapaId, costo] of Object.entries(costos)) {
          if (costo !== null) await intentar('Costos', () => guardarCosto(e, id, undefined, etapaId, null, costo))
        }
        await intentar('Markup', () => guardarMarkup(e, id, (markupPct ?? 100) / 100))
      }
      return { id, avisos }
    },
    onSuccess: async ({ id, avisos }) => {
      await refrescar()
      if (avisos.length) toast.warning(`El modelo se creó, pero revisa: ${avisos.join(' · ')}`)
      else toast.success(componentes && !sobreDiseno ? 'Modelo creado. Agrega los ajustes por opción y prueba el precio.' : 'Modelo creado')
      navigate(`/catalogo/modelos/${id}`, { replace: true })
    },
    onError: (e) => setError(mensajeError(e)),
  })

  if (!editar) return <SinAcceso />

  function siguiente() {
    setError(null)
    if (paso === 0) {
      if (!nombre.trim()) return setError('Escribe el nombre del modelo.')
      if (categoria === NUEVA && !categoriaNueva.trim()) return setError('Escribe el nombre de la categoría nueva.')
    }
    if (paso < PASOS.length - 1) setPaso(paso + 1)
    else crear.mutate()
  }

  const etapasActivas = etapas.data?.filter((e) => e.activo) ?? []

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild aria-label="Volver al catálogo">
          <Link to="/catalogo">
            <ArrowLeft aria-hidden />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo modelo</h1>
      </div>

      <ol className="flex items-center gap-2 text-sm" aria-label="Pasos">
        {PASOS.map((p, i) => (
          <li key={p} className="flex items-center gap-2" aria-current={i === paso ? 'step' : undefined}>
            <span
              className={cn(
                'flex size-6 items-center justify-center rounded-full border text-xs tabular',
                i < paso && 'border-primary bg-primary text-primary-foreground',
                i === paso && 'border-primary font-semibold',
              )}
            >
              {i < paso ? <Check className="size-3.5" aria-hidden /> : i + 1}
            </span>
            <span className={i === paso ? '' : 'text-muted-foreground'}>{p}</span>
            {i < PASOS.length - 1 && <span className="h-px w-6 bg-border" aria-hidden />}
          </li>
        ))}
      </ol>

      <Card>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            siguiente()
          }}
        >
          <CardHeader className="mb-6">
            <CardTitle>{PASOS[paso]}</CardTitle>
            <CardDescription>
              {paso === 0 && 'Cómo se llama, de qué tipo es y cómo se ve.'}
              {paso === 1 && 'Qué elige el cliente: madera, recubrimiento, medida… Puedes usar grupos que ya existen o crear uno.'}
              {paso === 2 &&
                (sobreDiseno
                  ? 'Es sobre diseño: el precio se captura a mano en cada cotización.'
                  : componentes
                    ? 'Lo que te cuesta cada etapa y tu markup. Los ajustes por opción (Nogal +600…) se capturan en la ficha del modelo.'
                    : 'El precio base antes de los ajustes por opción y de la lista de precios.')}
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-5">
            {paso === 0 && (
              <>
                <Campo id="am-nombre" etiqueta="Nombre del modelo">
                  <Input id="am-nombre" autoFocus placeholder="Silla Natalia" value={nombre} onChange={(e) => setNombre(e.target.value)} />
                </Campo>
                <Campo id="am-categoria" etiqueta="Categoría">
                  <Select value={categoria} onValueChange={setCategoria}>
                    <SelectTrigger id="am-categoria" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SIN}>Sin categoría</SelectItem>
                      {categorias.data?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                      <SelectItem value={NUEVA}>+ Nueva categoría</SelectItem>
                    </SelectContent>
                  </Select>
                </Campo>
                {categoria === NUEVA && (
                  <Campo id="am-categoria-nueva" etiqueta="Nombre de la categoría">
                    <Input id="am-categoria-nueva" placeholder="Silla" value={categoriaNueva} onChange={(e) => setCategoriaNueva(e.target.value)} />
                  </Campo>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="am-foto">Foto (opcional)</Label>
                  <input
                    id="am-foto"
                    type="file"
                    className="peer sr-only"
                    accept={LOGO_TIPOS.join(',')}
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null
                      const err = f && validarImagen(f)
                      if (err) {
                        e.target.value = ''
                        return setError(err)
                      }
                      setFoto(f)
                    }}
                  />
                  <div className="flex items-center gap-3 peer-focus-visible:[&>label]:ring-[3px] peer-focus-visible:[&>label]:ring-ring/50">
                    <Button type="button" variant="outline" asChild>
                      <label htmlFor="am-foto" className="cursor-pointer">
                        <ImagePlus aria-hidden /> {foto ? 'Cambiar foto' : 'Elegir foto'}
                      </label>
                    </Button>
                    <span className="min-w-0 truncate text-sm text-muted-foreground">{foto ? foto.name : 'Sin foto'}</span>
                  </div>
                </div>
                <label className="flex items-center justify-between gap-4 rounded-xl border p-3">
                  <span className="grid gap-0.5">
                    <span className="text-sm font-medium">Sobre diseño</span>
                    <span className="text-sm text-muted-foreground">Muebles a medida: el precio se captura a mano al cotizar.</span>
                  </span>
                  <Switch checked={sobreDiseno} onCheckedChange={setSobreDiseno} />
                </label>
              </>
            )}

            {paso === 1 && (
              <>
                {grupos.data && grupos.data.length > 0 ? (
                  <ul className="grid gap-3">
                    {grupos.data.map((g) => {
                      const id = `am-grupo-${g.id}`
                      return (
                        <li key={g.id} className="flex items-start gap-3 rounded-xl border p-3">
                          <Checkbox
                            id={id}
                            checked={elegidos.includes(g.id)}
                            onCheckedChange={(v) => setElegidos(v ? [...elegidos, g.id] : elegidos.filter((x) => x !== g.id))}
                          />
                          <Label htmlFor={id} className="grid gap-0.5 font-normal">
                            <span className="font-medium">{g.nombre}</span>
                            <span className="text-sm text-muted-foreground">{g.opciones.map((o) => o.nombre).join(' · ') || 'Sin opciones'}</span>
                          </Label>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Aún no hay grupos de opciones. Crea el primero, o continúa si este modelo no tiene opciones.</p>
                )}
                <NuevoGrupo alCrear={(id) => setElegidos((e) => [...e, id])} />
              </>
            )}

            {paso === 2 && !sobreDiseno && componentes && (
              <>
                <div className="grid gap-3">
                  {etapasActivas.map((e) => (
                    <div key={e.id} className="grid grid-cols-[1fr_10rem] items-center gap-3">
                      <Label htmlFor={`am-costo-${e.id}`}>{e.nombre}</Label>
                      <CampoMonto
                        id={`am-costo-${e.id}`}
                        valor={costos[e.id] ?? null}
                        placeholder="—"
                        onConfirmar={(v) => setCostos((c) => ({ ...c, [e.id]: v }))}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">Deja vacías las etapas que este modelo no lleva.</p>
                <div className="grid grid-cols-[1fr_10rem] items-center gap-3 border-t pt-4">
                  <Label htmlFor="am-markup" className="grid gap-0.5">
                    Markup (%)
                    <span className="font-normal text-muted-foreground">100 = precio al doble del costo</span>
                  </Label>
                  <CampoMonto id="am-markup" valor={markupPct} onConfirmar={setMarkupPct} />
                </div>
              </>
            )}

            {paso === 2 && !sobreDiseno && !componentes && (
              <Campo id="am-precio" etiqueta="Precio base" className="max-w-xs">
                <CampoMonto id="am-precio" valor={precioBase} onConfirmar={setPrecioBase} placeholder="0" />
              </Campo>
            )}

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </CardContent>

          <CardFooter className="mt-6 flex justify-between">
            {paso > 0 ? (
              <Button type="button" variant="ghost" onClick={() => setPaso(paso - 1)} disabled={crear.isPending}>
                Atrás
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={crear.isPending}>
              {paso < PASOS.length - 1 ? 'Continuar' : crear.isPending ? 'Creando…' : 'Crear modelo'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
