import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { usePuedeEditar } from '@/app/empresa-activa'
import { Campo } from '@/components/campo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  actualizarEmpresa,
  borrarArchivoPublico,
  leerEmpresa,
  subirLogoConCopia,
  urlPublica,
} from '@/features/empresa/api'
import { SelectorColor, SelectorLogo } from '@/features/empresa/components/selector-logo'
import { ajustesEmpresaSchema, colorMarca } from '@/features/empresa/schemas'
import { mensajeError } from '@/lib/errores'
import type { Enum, Fila } from '@/lib/supabase'
import { cn } from '@/lib/utils'

type Entrada = z.input<typeof ajustesEmpresaSchema>
type Salida = z.output<typeof ajustesEmpresaSchema>

// La base guarda el IVA como fracción (0.16); en pantalla se captura como porcentaje (16).
function aFormulario(e: Fila<'empresas'>): Entrada {
  return {
    nombre: e.nombre,
    razon_social: e.razon_social ?? '',
    rfc: e.rfc ?? '',
    telefono: e.telefono ?? '',
    email: e.email ?? '',
    direccion: e.direccion ?? '',
    iva_pct: Math.round(Number(e.iva) * 10000) / 100,
    vigencia_cotizacion_dias: e.vigencia_cotizacion_dias,
    anticipo_pct: Number(e.anticipo_pct),
    condiciones_cotizacion: e.condiciones_cotizacion ?? '',
  }
}

function TarjetaMarca({ empresa, habilitado }: { empresa: Fila<'empresas'>; habilitado: boolean }) {
  const queryClient = useQueryClient()
  const [logo, setLogo] = useState<File | null>(null)
  const [color, setColor] = useState(empresa.color_marca)
  const colorValido = colorMarca.safeParse(color).success
  const hayCambios = !!logo || color.toLowerCase() !== empresa.color_marca.toLowerCase()

  const guardar = useMutation({
    mutationFn: async () => {
      const rutas = logo ? await subirLogoConCopia(empresa.id, logo) : null
      await actualizarEmpresa(empresa.id, { color_marca: color, ...(rutas ?? {}) })
      // Los anteriores se borran después de guardar los nuevos; si falla, solo quedan archivos huérfanos.
      if (rutas) {
        for (const viejo of new Set([empresa.logo_path, empresa.logo_pdf_path])) {
          if (viejo) await borrarArchivoPublico(viejo).catch(() => undefined)
        }
      }
    },
    onSuccess: async () => {
      setLogo(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['empresa', empresa.id] }),
        queryClient.invalidateQueries({ queryKey: ['membresias'] }),
      ])
      toast.success('Marca actualizada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marca</CardTitle>
        <CardDescription>Tu logo y tu color aparecen en cotizaciones, recibos y en el portal del cliente.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-2">
          <Label>Logo</Label>
          <SelectorLogo archivo={logo} actualUrl={urlPublica(empresa.logo_path)} onCambiar={setLogo} disabled={!habilitado} />
        </div>
        <Campo id="aj-color" etiqueta="Color de la marca" error={colorValido ? undefined : 'Usa un color en formato #RRGGBB.'}>
          <SelectorColor id="aj-color" valor={color} onCambiar={setColor} disabled={!habilitado} />
        </Campo>
        <div>
          <Button onClick={() => guardar.mutate()} disabled={!habilitado || !hayCambios || !colorValido || guardar.isPending}>
            {guardar.isPending ? 'Guardando…' : 'Guardar marca'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

const METODOS: { valor: Enum<'metodo_precio'>; titulo: string; descripcion: string }[] = [
  {
    valor: 'componentes',
    titulo: 'Costo por etapas × markup',
    descripcion: 'Capturas el costo de cada etapa y un markup por modelo.',
  },
  {
    valor: 'base_ajustes',
    titulo: 'Precio base + ajustes',
    descripcion: 'Cada modelo tiene un precio base y cada opción suma o resta.',
  },
]

function TarjetaMetodo({ empresa, habilitado }: { empresa: Fila<'empresas'>; habilitado: boolean }) {
  const queryClient = useQueryClient()
  const [metodo, setMetodo] = useState(empresa.metodo_precio)
  const guardar = useMutation({
    mutationFn: () => actualizarEmpresa(empresa.id, { metodo_precio: metodo }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['empresa', empresa.id] })
      await queryClient.invalidateQueries({ queryKey: ['membresias'] })
      await queryClient.invalidateQueries({ queryKey: ['catalogo', empresa.id] })
      toast.success('Método de precio actualizado')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Método de precio</CardTitle>
        <CardDescription>
          Cómo calcula el catálogo el precio de cada mueble. Al cambiarlo, los precios nuevos usan el otro método; los datos capturados del
          anterior se conservan por si regresas.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <RadioGroup value={metodo} onValueChange={(v) => setMetodo(v as Enum<'metodo_precio'>)} className="grid gap-3 sm:grid-cols-2" aria-label="Método de precio" disabled={!habilitado}>
          {METODOS.map((m) => (
            <Label
              key={m.valor}
              htmlFor={`aj-metodo-${m.valor}`}
              className={cn('flex cursor-pointer items-start gap-3 rounded-xl border p-4 font-normal', metodo === m.valor && 'border-primary bg-muted/50')}
            >
              <RadioGroupItem id={`aj-metodo-${m.valor}`} value={m.valor} className="mt-0.5" />
              <span className="grid gap-1">
                <span className="font-medium">{m.titulo}</span>
                <span className="text-sm text-muted-foreground">{m.descripcion}</span>
              </span>
            </Label>
          ))}
        </RadioGroup>
        <div>
          <Button onClick={() => guardar.mutate()} disabled={!habilitado || metodo === empresa.metodo_precio || guardar.isPending}>
            {guardar.isPending ? 'Guardando…' : 'Guardar método'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function FormularioDatos({ empresa, habilitado }: { empresa: Fila<'empresas'>; habilitado: boolean }) {
  const queryClient = useQueryClient()
  const form = useForm<Entrada, unknown, Salida>({
    resolver: zodResolver(ajustesEmpresaSchema),
    defaultValues: aFormulario(empresa),
  })
  const { errors, isDirty } = form.formState
  useEffect(() => form.reset(aFormulario(empresa)), [empresa, form])

  const guardar = useMutation({
    mutationFn: ({ iva_pct, ...v }: Salida) =>
      actualizarEmpresa(empresa.id, { ...v, iva: Math.round(iva_pct * 100) / 10000 }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['empresa', empresa.id] }),
        queryClient.invalidateQueries({ queryKey: ['membresias'] }),
      ])
      toast.success('Cambios guardados')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })

  const campo = (id: keyof Entrada) => ({
    id: `aj-${id}`,
    'aria-describedby': `aj-${id}-nota`,
    'aria-invalid': !!errors[id],
    disabled: !habilitado,
    ...form.register(id),
  })

  return (
    <form onSubmit={form.handleSubmit((v) => guardar.mutate(v))} noValidate className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Datos de la empresa</CardTitle>
          <CardDescription>Aparecen en el encabezado de tus cotizaciones y recibos.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Campo id="aj-nombre" etiqueta="Nombre comercial" error={errors.nombre?.message}>
            <Input {...campo('nombre')} />
          </Campo>
          <Campo id="aj-slug" etiqueta="Dirección del portal" ayuda="No se puede cambiar.">
            <Input id="aj-slug" value={`${window.location.host}/${empresa.slug}`} readOnly disabled aria-describedby="aj-slug-nota" />
          </Campo>
          <Campo id="aj-razon_social" etiqueta="Razón social (opcional)" error={errors.razon_social?.message}>
            <Input {...campo('razon_social')} />
          </Campo>
          <Campo id="aj-rfc" etiqueta="RFC (opcional)" error={errors.rfc?.message}>
            <Input {...campo('rfc')} className="uppercase" autoCapitalize="characters" />
          </Campo>
          <Campo id="aj-telefono" etiqueta="Teléfono (opcional)" error={errors.telefono?.message}>
            <Input {...campo('telefono')} type="tel" autoComplete="tel" />
          </Campo>
          <Campo id="aj-email" etiqueta="Correo de contacto (opcional)" error={errors.email?.message}>
            <Input {...campo('email')} type="email" autoComplete="email" />
          </Campo>
          <Campo id="aj-direccion" etiqueta="Dirección (opcional)" error={errors.direccion?.message} className="sm:col-span-2">
            <Textarea {...campo('direccion')} rows={2} />
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cotizaciones y cobranza</CardTitle>
          <CardDescription>Valores predeterminados para cotizaciones y pedidos nuevos.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-3">
          <Campo id="aj-iva_pct" etiqueta="IVA (%)" error={errors.iva_pct?.message}>
            <Input {...campo('iva_pct')} type="number" inputMode="decimal" step="0.01" min={0} max={99.99} className="tabular" />
          </Campo>
          <Campo id="aj-vigencia_cotizacion_dias" etiqueta="Vigencia (días)" error={errors.vigencia_cotizacion_dias?.message}>
            <Input {...campo('vigencia_cotizacion_dias')} type="number" inputMode="numeric" min={1} max={180} className="tabular" />
          </Campo>
          <Campo id="aj-anticipo_pct" etiqueta="Anticipo (%)" error={errors.anticipo_pct?.message}>
            <Input {...campo('anticipo_pct')} type="number" inputMode="decimal" step="0.01" min={0} max={100} className="tabular" />
          </Campo>
          <Campo
            id="aj-condiciones_cotizacion"
            etiqueta="Condiciones comerciales"
            error={errors.condiciones_cotizacion?.message}
            ayuda="Se imprimen al final de cada cotización: tiempos de entrega, garantía, formas de pago…"
            className="sm:col-span-3"
          >
            <Textarea {...campo('condiciones_cotizacion')} rows={5} />
          </Campo>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" disabled={!isDirty || guardar.isPending} onClick={() => form.reset(aFormulario(empresa))}>
          Descartar
        </Button>
        <Button type="submit" disabled={!habilitado || !isDirty || guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}

export function AjustesEmpresa({ empresaId }: { empresaId: string }) {
  const habilitado = usePuedeEditar('configurar_empresa')
  const { data: empresa, isPending, error } = useQuery({
    queryKey: ['empresa', empresaId],
    queryFn: () => leerEmpresa(empresaId),
  })

  if (isPending) {
    return (
      <div className="grid gap-6">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    )
  }
  if (error) return <p className="text-sm text-destructive">{mensajeError(error)}</p>

  return (
    <div className="grid gap-6">
      <TarjetaMarca key={`${empresa.id}-${empresa.logo_path}-${empresa.color_marca}`} empresa={empresa} habilitado={habilitado} />
      <TarjetaMetodo key={`metodo-${empresa.metodo_precio}`} empresa={empresa} habilitado={habilitado} />
      <FormularioDatos empresa={empresa} habilitado={habilitado} />
    </div>
  )
}
