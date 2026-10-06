import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, CheckCircle2, CreditCard, Loader2, Lock } from 'lucide-react'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { useEmpresaActiva, usePuede } from '@/app/empresa-activa'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { marca } from '@/config/marca'
import { abrirPortalPago, iniciarSuscripcion, leerSuscripcion, type Suscripcion } from '@/features/suscripcion/api'
import { diasRestantes } from '@/features/suscripcion/prueba'
import { mensajeError } from '@/lib/errores'
import { fecha } from '@/lib/formato'

const PLAN = { mes: 'mensual', anio: 'anual' } as const

function Estado({ s }: { s: Suscripcion }) {
  const plan = s.plan_intervalo === 'anio' || s.plan_intervalo === 'mes' ? PLAN[s.plan_intervalo] : null
  switch (s.estado_suscripcion) {
    case 'prueba': {
      const dias = diasRestantes(s.prueba_termina)
      return dias > 0 ? (
        <p className="flex items-start gap-3">
          <CalendarClock className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            <strong>Periodo de prueba.</strong> {dias === 1 ? 'Termina hoy' : `Te quedan ${dias} días`} (hasta el {fecha(s.prueba_termina)}). Después, la cuenta queda en solo
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
            <strong>Suscripción activa{plan ? `, plan ${plan}` : ''}.</strong>{' '}
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

  useEffect(() => {
    if (regreso === 'ok' && activa) {
      void queryClient.invalidateQueries({ queryKey: ['puede_escribir', empresa!.id] })
      void queryClient.invalidateQueries({ queryKey: ['membresias'] })
    }
  }, [regreso, activa, queryClient, empresa])

  const irA = (url: string) => window.location.assign(url)
  const suscribir = useMutation({ mutationFn: (i: 'mes' | 'anio') => iniciarSuscripcion(empresa!.id, i), onSuccess: (r) => irA(r.url) })
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
            {marca.nombre} se paga por empresa, con todos tus usuarios incluidos. Pagas con tarjeta a través de Stripe; nunca vemos ni guardamos los datos de tu tarjeta.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          {suscripcion.isPending ? <Skeleton className="h-12" /> : suscripcion.error ? <p className="text-destructive">{mensajeError(suscripcion.error)}</p> : <Estado s={suscripcion.data} />}
        </CardContent>
        {esAdmin && suscripcion.data && (
          <CardFooter className="flex flex-wrap gap-2">
            {!activa && (
              <>
                <Button onClick={() => suscribir.mutate('mes')} disabled={suscribir.isPending}>
                  <CreditCard aria-hidden /> Suscribirme mensual
                </Button>
                <Button variant="outline" onClick={() => suscribir.mutate('anio')} disabled={suscribir.isPending}>
                  Suscribirme anual
                </Button>
              </>
            )}
            {suscripcion.data.stripe_customer_id && (
              <Button variant={activa ? 'default' : 'ghost'} onClick={() => portal.mutate()} disabled={portal.isPending}>
                Administrar pago
              </Button>
            )}
          </CardFooter>
        )}
      </Card>
      {(suscribir.isPending || portal.isPending) && <p className="text-sm text-muted-foreground">Abriendo Stripe…</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {mensajeError(error)}
        </p>
      )}
      {!activa && <p className="text-sm text-muted-foreground">El precio de cada plan aparece en la página de pago de Stripe, antes de confirmar.</p>}
    </div>
  )
}
