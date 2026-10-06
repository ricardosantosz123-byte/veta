import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, CircleAlert, Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { useEmpresaActiva } from '@/app/empresa-activa'
import { Campo } from '@/components/campo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { marca } from '@/config/marca'
import { useAuth } from '@/features/auth/auth-provider'
import {
  actualizarEmpresa,
  crearEmpresa,
  slugDisponible,
  subirLogo,
  sugerirSlug,
} from '@/features/empresa/api'
import { SelectorColor, SelectorLogo } from '@/features/empresa/components/selector-logo'
import { COLOR_PREDETERMINADO, colorMarca, metodoPrecio, pasoNombreSchema } from '@/features/empresa/schemas'
import { useRetraso } from '@/hooks/use-retraso'
import { mensajeError } from '@/lib/errores'
import { cn } from '@/lib/utils'

const schema = pasoNombreSchema.extend({ color: colorMarca, metodo: metodoPrecio })
type Entrada = z.input<typeof schema>
type Salida = z.output<typeof schema>

const PASOS = ['Tu empresa', 'Tu marca', 'Tus precios'] as const

const metodos = [
  {
    valor: 'componentes',
    titulo: 'Costo por etapas × markup',
    descripcion:
      'Capturas lo que te cuesta cada etapa (carpintería, laca, tapicería…) y un markup por modelo. Ideal si fabricas o mandas a maquilar.',
    ejemplo: 'Carpintería 1,800 + Tapicería 900, con 100 % de markup → $5,400',
  },
  {
    valor: 'base_ajustes',
    titulo: 'Precio base + ajustes',
    descripcion: 'Cada modelo tiene un precio base y cada opción suma o resta. Ideal si ya tienes una lista de precios.',
    ejemplo: 'Silla Natalia $4,500 + Nogal $600 + Piel $900 → $6,000',
  },
] as const

function EstadoSlug({ slug, valido }: { slug: string; valido: boolean }) {
  const consulta = useRetraso(slug, 300)
  const { data, isFetching, isError } = useQuery({
    queryKey: ['slug_disponible', consulta],
    queryFn: () => slugDisponible(consulta),
    enabled: valido && consulta === slug,
    staleTime: 10_000,
  })

  if (!valido || !slug) return null
  if (consulta !== slug || isFetching) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Revisando…
      </span>
    )
  }
  if (isError) return <span className="text-sm text-destructive">No pudimos revisar el slug. Intenta de nuevo.</span>
  return data ? (
    <span className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
      <Check className="size-4" aria-hidden /> Disponible
    </span>
  ) : (
    <span className="flex items-center gap-1.5 text-sm text-destructive">
      <CircleAlert className="size-4" aria-hidden /> Ya está en uso o está reservado
    </span>
  )
}

export function AsistenteAlta() {
  const { user, cargando: cargandoAuth } = useAuth()
  const { membresias, elegir } = useEmpresaActiva()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [paso, setPaso] = useState(0)
  const [slugTocado, setSlugTocado] = useState(false)
  const [logo, setLogo] = useState<File | null>(null)
  // Si crear_empresa ya funcionó y falló un paso posterior, el reintento no vuelve a crearla.
  const creada = useRef<string | null>(null)

  const form = useForm<Entrada, unknown, Salida>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { nombre: '', slug: '', color: COLOR_PREDETERMINADO, metodo: 'componentes' },
  })
  const { errors } = form.formState
  const slug = useWatch({ control: form.control, name: 'slug' })
  const slugValido = pasoNombreSchema.shape.slug.safeParse(slug).success

  const crear = useMutation({
    mutationFn: async (v: Salida) => {
      const id = creada.current ?? (await crearEmpresa(v.nombre, v.slug))
      creada.current = id
      // La empresa ya existe: si el logo falla, se avisa y se puede subir después en Ajustes.
      let logo_path: string | null = null
      let avisoLogo: string | null = null
      if (logo) {
        try {
          logo_path = await subirLogo(id, logo)
        } catch (e) {
          avisoLogo = mensajeError(e)
        }
      }
      await actualizarEmpresa(id, { color_marca: v.color, metodo_precio: v.metodo, ...(logo_path ? { logo_path } : {}) })
      return { id, avisoLogo }
    },
    onSuccess: async ({ id, avisoLogo }) => {
      elegir(id)
      await queryClient.invalidateQueries({ queryKey: ['membresias'] })
      if (avisoLogo) toast.warning(`Tu empresa quedó creada, pero el logo no se subió: ${avisoLogo} Súbelo en Ajustes.`)
      else toast.success('¡Listo! Tu empresa quedó creada.')
      navigate('/', { replace: true })
    },
  })

  if (!cargandoAuth && !user) return <Navigate to="/entrar" replace />

  async function siguiente() {
    if (paso === 0) {
      const ok = await form.trigger(['nombre', 'slug'])
      if (!ok) return
      const libre = await queryClient.fetchQuery({
        queryKey: ['slug_disponible', form.getValues('slug').trim().toLowerCase()],
        queryFn: () => slugDisponible(form.getValues('slug').trim().toLowerCase()),
        staleTime: 10_000,
      })
      if (!libre) return form.setError('slug', { message: 'Ese slug ya está en uso o está reservado. Elige otro.' })
    }
    if (paso === 1 && !(await form.trigger('color'))) return
    setPaso((p) => p + 1)
  }

  const enviar = form.handleSubmit((v) => crear.mutate(v))
  const esUltimo = paso === PASOS.length - 1

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Bienvenido a {marca.nombre}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Da de alta tu empresa</h1>
      </div>

      <ol className="flex items-center gap-2 text-sm" aria-label="Pasos">
        {PASOS.map((nombre, i) => (
          <li key={nombre} className="flex items-center gap-2" aria-current={i === paso ? 'step' : undefined}>
            <span
              className={cn(
                'flex size-6 items-center justify-center rounded-full border text-xs tabular',
                i < paso && 'border-primary bg-primary text-primary-foreground',
                i === paso && 'border-primary font-semibold',
              )}
            >
              {i < paso ? <Check className="size-3.5" aria-hidden /> : i + 1}
            </span>
            <span className={cn('hidden sm:inline', i !== paso && 'text-muted-foreground')}>{nombre}</span>
            {i < PASOS.length - 1 && <span className="h-px w-6 bg-border" aria-hidden />}
          </li>
        ))}
      </ol>

      <Card className="w-full max-w-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (esUltimo) void enviar()
            else void siguiente()
          }}
          noValidate
        >
          <CardHeader className="mb-6">
            <CardTitle>{PASOS[paso]}</CardTitle>
            <CardDescription>
              {paso === 0 && 'El slug es la dirección de tu portal para clientes. No se puede cambiar después.'}
              {paso === 1 && 'Tu logo y tu color aparecen en cotizaciones, recibos y en el portal. Puedes cambiarlos después.'}
              {paso === 2 && '¿Cómo calculas el precio de tus muebles? Puedes cambiarlo después en Ajustes.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-5">
            {paso === 0 && (
              <>
                <Campo id="alta-nombre" etiqueta="Nombre de la empresa" error={errors.nombre?.message}>
                  <Input
                    id="alta-nombre"
                    autoFocus
                    placeholder="Mueblería Sauce"
                    aria-describedby="alta-nombre-nota"
                    aria-invalid={!!errors.nombre}
                    {...form.register('nombre', {
                      onChange: (e) => {
                        if (!slugTocado) form.setValue('slug', sugerirSlug(e.target.value), { shouldValidate: true })
                      },
                    })}
                  />
                </Campo>
                <Campo
                  id="alta-slug"
                  etiqueta="Dirección de tu portal"
                  error={errors.slug?.message}
                  ayuda={<EstadoSlug slug={slug.trim().toLowerCase()} valido={slugValido} />}
                >
                  <div className="flex items-center rounded-md border focus-within:ring-[3px] focus-within:ring-ring/50">
                    <span className="pl-3 text-sm text-muted-foreground select-none">{window.location.host}/</span>
                    <input
                      id="alta-slug"
                      autoCapitalize="none"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="muebleria-sauce"
                      className="h-9 min-w-0 flex-1 bg-transparent pr-3 text-sm outline-none"
                      aria-describedby="alta-slug-nota"
                      aria-invalid={!!errors.slug}
                      {...form.register('slug', { onChange: () => setSlugTocado(true) })}
                    />
                  </div>
                </Campo>
              </>
            )}

            {paso === 1 && (
              <>
                <div className="grid gap-2">
                  <Label>Logo (opcional)</Label>
                  <SelectorLogo archivo={logo} onCambiar={setLogo} />
                </div>
                <Campo id="alta-color" etiqueta="Color de tu marca" error={errors.color?.message} ayuda="Se usa como acento en PDFs y en el portal.">
                  <Controller
                    control={form.control}
                    name="color"
                    render={({ field }) => <SelectorColor id="alta-color" valor={field.value} onCambiar={field.onChange} />}
                  />
                </Campo>
              </>
            )}

            {paso === 2 && (
              <Controller
                control={form.control}
                name="metodo"
                render={({ field }) => (
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-3" aria-label="Método de precio">
                    {metodos.map((m) => (
                      <Label
                        key={m.valor}
                        htmlFor={`metodo-${m.valor}`}
                        className={cn(
                          'flex cursor-pointer items-start gap-3 rounded-xl border p-4 font-normal transition-colors',
                          field.value === m.valor && 'border-primary bg-muted/50',
                        )}
                      >
                        <RadioGroupItem id={`metodo-${m.valor}`} value={m.valor} className="mt-0.5" />
                        <span className="grid gap-1">
                          <span className="font-medium">{m.titulo}</span>
                          <span className="text-sm text-muted-foreground">{m.descripcion}</span>
                          <span className="text-xs text-muted-foreground tabular">Ejemplo: {m.ejemplo}</span>
                        </span>
                      </Label>
                    ))}
                  </RadioGroup>
                )}
              />
            )}

            {crear.isError && (
              <p role="alert" className="text-sm text-destructive">
                {mensajeError(crear.error)}
              </p>
            )}
          </CardContent>

          <CardFooter className="mt-6 flex justify-between gap-2">
            {paso > 0 ? (
              <Button type="button" variant="ghost" onClick={() => setPaso((p) => p - 1)} disabled={crear.isPending}>
                Atrás
              </Button>
            ) : membresias.length > 0 ? (
              <Button type="button" variant="ghost" asChild>
                <Link to="/">Cancelar</Link>
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={crear.isPending}>
              {esUltimo ? (crear.isPending ? 'Creando empresa…' : 'Crear empresa') : 'Continuar'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
