import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, CheckCircle2, CreditCard, Loader2, Lock, Minus, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useEmpresaActiva, usePuede } from '@/app/empresa-activa'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { buscarPlan, planes, type PlanId } from '@/config/planes'
import {
  abrirPortalPago,
  cambiarUsuariosExtra,
  iniciarSuscripcion,
  leerSuscripcion,
  leerUsoPlan,
  type Suscripcion,
  type UsoPlan,
} from '@/features/suscripcion/api'
import { diasRestantes } from '@/features/suscripcion/prueba'
import { mensajeError } from '@/lib/errores'
import { fecha, monedaEntera } from '@/lib/formato'
import { cn } from '@/lib/utils'

const PERIODO = { mes: 'mensual', anio: 'anual' } as const

function Estado({ s }: { s: Suscripcion }) {
  const periodo = s.plan_intervalo === 'anio' || s.plan_intervalo === 'mes' ? PERIODO[s.plan_intervalo] : null
  const plan = [buscarPlan(s.plan)?.nombre, periodo].filter(Boolean).join(', ')
  switch (s.estado_suscripcion) {
    case 'prueba': {
      const dias = diasRestantes(s.prueba_termina)
      return dias > 0 ? (
        <p className="flex items-start gap-3">
          <CalendarClock className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            <strong>Periodo de prueba, plan {buscarPlan(s.plan)?.nombre ?? 'Mueblería'}.</strong> {dias === 1 ? 'Termina hoy' : `Te quedan ${dias} días`} (hasta el {fecha(s.prueba_termina)}). Después, la cuenta queda en solo
            lectura hasta que te suscribas. Tus datos no se borran.
          </span>
        </p>
      ) : (
        <p className="flex items-start gap-3">
          <Lock className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            <strong>Tu prueba terminó el {fecha(s.prueba_termina)}.</strong> La cuenta está en solo lectura: puedes consultar todo, pero no crear ni editar. Suscríbete para seguir.
          </span>
        </p>
      )
    }
    case 'activa':
      return (
        <p className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            <strong>Suscripción activa{plan ? `: ${plan}` : ''}.</strong>{' '}
            {s.periodo_termina &&
              (s.cancela_al_final ? `Se cancela el ${fecha(s.periodo_termina)}; hasta entonces todo funciona igual.` : `Se renueva el ${fecha(s.periodo_termina)}.`)}
          </span>
        </p>
      )
    case 'vencida':
      return (
        <p className="flex items-start gap-3">
          <Lock className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            <strong>Suscripción vencida.</strong> No pudimos cobrar la renovación. Actualiza tu tarjeta en “Administrar pago” para volver a editar.
          </span>
        </p>
      )
    case 'cancelada':
      return (
        <p className="flex items-start gap-3">
          <Lock className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            <strong>Suscripción cancelada.</strong> La cuenta está en solo lectura. Puedes volver a suscribirte cuando quieras; tus datos siguen aquí.
          </span>
        </p>
      )
  }
}

function Medidor({ nombre, usados, incluidos }: { nombre: string; usados: number; incluidos: number }) {
  const pct = Math.min(usados / incluidos, 1) * 100
  return (
    <div className="grid gap-1.5">
      <div className="flex justify-between text-sm">
        <span>{nombre}</span>
        <span className="tabular text-muted-foreground">
          {usados} de {incluidos}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className={cn('h-full rounded-full', usados > incluidos ? 'bg-aviso' : 'bg-foreground')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** Lugares del plan: oficina, proveedores y adicionales (bolsa compartida). Los cuenta la base (uso_plan). */
function Usuarios({ uso, activa, intervalo }: { uso: UsoPlan; activa: boolean; intervalo: string | null }) {
  const { empresa } = useEmpresaActiva()
  const esAdmin = usePuede('gestionar_suscripcion')
  const queryClient = useQueryClient()
  const [cantidad, setCantidad] = useState(uso.extra)
  const cambiar = useMutation({
    mutationFn: () => cambiarUsuariosExtra(empresa!.id, cantidad),
    // El webhook de Stripe actualiza la base unos segundos después.
    onSuccess: () => setTimeout(() => void queryClient.invalidateQueries({ queryKey: ['uso-plan', empresa!.id] }), 4000),
  })
  const precio = intervalo === 'anio' ? `${monedaEntera(planes.extra.anual)} al año` : `${monedaEntera(planes.extra.mensual)} al mes`
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuarios</CardTitle>
        <CardDescription>
          Tu plan incluye {uso.oficina_incluidos} usuarios de oficina (Vendedor, Comprador o Producción) y {uso.proveedores_incluidos} proveedores con acceso. Admin y Contador no
          cuentan. Las invitaciones pendientes ocupan lugar.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Medidor nombre="Usuarios de oficina" usados={uso.oficina} incluidos={uso.oficina_incluidos} />
        <Medidor nombre="Proveedores con acceso" usados={uso.proveedores} incluidos={uso.proveedores_incluidos} />
        <p className="text-sm">
          Usuarios adicionales: <span className="font-medium tabular">{uso.extra_usados}</span> en uso de <span className="font-medium tabular">{uso.extra}</span> contratados.
          <span className="text-muted-foreground"> Cada uno cuesta {precio} y sirve para oficina o proveedor.</span>
        </p>
        {uso.excedido && (
          <p role="status" className="rounded-xl border border-aviso/40 bg-aviso-suave p-3 text-sm">
            Tienes más usuarios de los que cubre tu plan. No podrás invitar ni reactivar a nadie hasta agregar usuarios adicionales o liberar lugares.
          </p>
        )}
        {esAdmin && activa && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-lg border" role="group" aria-label="Usuarios adicionales contratados">
              <Button variant="ghost" size="icon-lg" aria-label="Uno menos" disabled={cantidad <= uso.extra_usados} onClick={() => setCantidad((c) => c - 1)}>
                <Minus aria-hidden />
              </Button>
              <span className="w-10 text-center font-medium tabular" aria-live="polite">
                {cantidad}
              </span>
              <Button variant="ghost" size="icon-lg" aria-label="Uno más" disabled={cantidad >= 50} onClick={() => setCantidad((c) => c + 1)}>
                <Plus aria-hidden />
              </Button>
            </div>
            <Button onClick={() => cambiar.mutate()} disabled={cantidad === uso.extra || cambiar.isPending}>
              {cambiar.isPending ? 'Actualizando…' : 'Guardar usuarios adicionales'}
            </Button>
            {cambiar.isSuccess && <span className="text-sm text-muted-foreground">Listo. Stripe ajusta el cobro con prorrateo.</span>}
            {cambiar.error && (
              <p role="alert" className="w-full text-sm text-destructive">
                {mensajeError(cambiar.error)}
              </p>
            )}
          </div>
        )}
        {esAdmin && !activa && (
          <p className="text-sm text-muted-foreground">Al suscribirte, el pago incluye los usuarios adicionales que ya estés usando. Después puedes agregar o quitar aquí.</p>
        )}
      </CardContent>
    </Card>
  )
}

/** Elegir plan y periodo antes de ir a Stripe. Despacho aparece como "Próximamente". */
function ElegirPlan({ actual, onElegir, pendiente }: { actual: string; onElegir: (plan: PlanId, i: 'mes' | 'anio') => void; pendiente: boolean }) {
  const [plan, setPlan] = useState<PlanId>(buscarPlan(actual)?.disponible ? (actual as PlanId) : 'muebleria')
  const [intervalo, setIntervalo] = useState<'mes' | 'anio'>('mes')
  return (
    <Card>
      <CardHeader>
        <CardTitle>Elige tu plan</CardTitle>
        <CardDescription>Precios en pesos con IVA incluido. El anual equivale a 10 meses: 2 gratis.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <RadioGroup value={intervalo} onValueChange={(v) => setIntervalo(v as 'mes' | 'anio')} className="flex flex-wrap gap-2" aria-label="Periodo de pago">
          {(['mes', 'anio'] as const).map((i) => (
            <Label
              key={i}
              htmlFor={`periodo-${i}`}
              className={cn('flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 font-normal transition-colors', intervalo === i && 'border-primary bg-muted/50')}
            >
              <RadioGroupItem id={`periodo-${i}`} value={i} />
              {i === 'mes' ? 'Mensual' : 'Anual (2 meses gratis)'}
            </Label>
          ))}
        </RadioGroup>
        <RadioGroup value={plan} onValueChange={(v) => setPlan(v as PlanId)} className="grid gap-3 sm:grid-cols-3" aria-label="Plan">
          {planes.lista.map((p) => (
            <Label
              key={p.id}
              htmlFor={`plan-${p.id}`}
              className={cn(
                'grid cursor-pointer content-start gap-1 rounded-xl border p-4 font-normal transition-colors',
                plan === p.id && 'border-primary bg-muted/50',
                !p.disponible && 'cursor-not-allowed opacity-60',
              )}
            >
              <span className="flex items-center gap-2">
                <RadioGroupItem id={`plan-${p.id}`} value={p.id} disabled={!p.disponible} />
                <span className="font-medium">{p.nombre}</span>
              </span>
              <span className="text-2xl font-semibold tabular">
                {monedaEntera(intervalo === 'mes' ? p.mensual : p.anual)}
                <span className="text-sm font-normal text-muted-foreground"> {intervalo === 'mes' ? 'al mes' : 'al año'}</span>
              </span>
              <span className="text-xs text-muted-foreground">{p.disponible ? p.para : 'Próximamente, con el módulo de Proyectos.'}</span>
            </Label>
          ))}
        </RadioGroup>
      </CardContent>
      <CardFooter>
        <Button onClick={() => onElegir(plan, intervalo)} disabled={pendiente}>
          <CreditCard aria-hidden /> Continuar al pago
        </Button>
      </CardFooter>
    </Card>
  )
}

/** Ajustes > Suscripción (Admin): estado, prueba, planes y Portal de Cliente de Stripe (PRD §5.11). */
export default function PaginaSuscripcion() {
  const { empresa } = useEmpresaActiva()
  const esAdmin = usePuede('gestionar_suscripcion')
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const regreso = params.get('estado')
  const suscripcion = useQuery({
    queryKey: ['suscripcion', empresa!.id],
    queryFn: () => leerSuscripcion(empresa!.id),
    // Al volver de Stripe el webhook puede tardar unos segundos: se consulta cada 3 s hasta verla activa.
    refetchInterval: (q) => (regreso === 'ok' && q.state.data?.estado_suscripcion !== 'activa' ? 3000 : false),
  })
  const activa = suscripcion.data?.estado_suscripcion === 'activa'
  const uso = useQuery({ queryKey: ['uso-plan', empresa!.id], queryFn: () => leerUsoPlan(empresa!.id) })

  useEffect(() => {
    if (regreso === 'ok' && activa) {
      void queryClient.invalidateQueries({ queryKey: ['puede_escribir', empresa!.id] })
      void queryClient.invalidateQueries({ queryKey: ['membresias'] })
    }
  }, [regreso, activa, queryClient, empresa])

  const irA = (url: string) => window.location.assign(url)
  const suscribir = useMutation({
    mutationFn: ({ plan, intervalo }: { plan: PlanId; intervalo: 'mes' | 'anio' }) => iniciarSuscripcion(empresa!.id, plan, intervalo),
    onSuccess: (r) => irA(r.url),
  })
  const portal = useMutation({ mutationFn: () => abrirPortalPago(empresa!.id), onSuccess: (r) => irA(r.url) })
  const error = suscribir.error ?? portal.error

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Suscripción</h1>

      {regreso === 'ok' && (
        <p role="status" className="flex items-center gap-2 rounded-xl border p-4 text-sm">
          {activa ? <CheckCircle2 className="size-5" aria-hidden /> : <Loader2 className="size-5 animate-spin" aria-hidden />}
          {activa ? '¡Listo! Tu suscripción está activa.' : 'Recibimos tu pago. Estamos confirmándolo con Stripe…'}
          <Button variant="link" size="sm" className="ml-auto" onClick={() => setParams({}, { replace: true })}>
            Cerrar
          </Button>
        </p>
      )}
      {regreso === 'cancelado' && <p className="rounded-xl border p-4 text-sm text-muted-foreground">No se hizo ningún cargo. Puedes suscribirte cuando quieras.</p>}

      <Card>
        <CardHeader>
          <CardTitle>Estado de tu cuenta</CardTitle>
          <CardDescription>
            Pagas con tarjeta a través de Stripe; nunca vemos ni guardamos los datos de tu tarjeta.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          {suscripcion.isPending ? <Skeleton className="h-12" /> : suscripcion.error ? <p className="text-destructive">{mensajeError(suscripcion.error)}</p> : <Estado s={suscripcion.data} />}
        </CardContent>
        {esAdmin && suscripcion.data?.stripe_customer_id && (
          <CardFooter>
            <Button variant={activa ? 'default' : 'ghost'} onClick={() => portal.mutate()} disabled={portal.isPending}>
              Administrar pago
            </Button>
          </CardFooter>
        )}
      </Card>

      {esAdmin && suscripcion.data && !activa && (
        <ElegirPlan actual={suscripcion.data.plan} pendiente={suscribir.isPending} onElegir={(plan, intervalo) => suscribir.mutate({ plan, intervalo })} />
      )}
      {uso.data && <Usuarios key={uso.data.extra} uso={uso.data} activa={activa} intervalo={suscripcion.data?.plan_intervalo ?? null} />}
      {(suscribir.isPending || portal.isPending) && <p className="text-sm text-muted-foreground">Abriendo Stripe…</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {mensajeError(error)}
        </p>
      )}
    </div>
  )
}
