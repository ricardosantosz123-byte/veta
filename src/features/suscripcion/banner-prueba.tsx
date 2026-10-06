import { Clock, Lock } from 'lucide-react'
import { Link } from 'react-router'
import { useEmpresaActiva, usePuede } from '@/app/empresa-activa'
import { Button } from '@/components/ui/button'
import { diasRestantes } from '@/features/suscripcion/prueba'
import { fecha } from '@/lib/formato'
import { cn } from '@/lib/utils'

export function BannerPrueba() {
  const { empresa, puedeEscribir } = useEmpresaActiva()
  const esAdmin = usePuede('gestionar_suscripcion')
  if (!empresa) return null

  // Solo lectura: lo ven todos, porque los botones de acción aparecen deshabilitados.
  if (!puedeEscribir) {
    const motivo =
      empresa.estado_suscripcion === 'prueba'
        ? `Tu periodo de prueba terminó el ${fecha(empresa.prueba_termina)}.`
        : empresa.estado_suscripcion === 'cancelada'
          ? 'La suscripción está cancelada.'
          : 'La suscripción está vencida.'
    return (
      <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-aviso-suave px-4 py-2.5 text-sm text-aviso-fuerte">
        <Lock className="size-4 shrink-0" aria-hidden />
        <p className="flex-1">
          <strong className="font-semibold">Solo lectura.</strong> {motivo}{' '}
          {esAdmin ? 'Suscríbete para volver a crear y editar.' : 'Pide al Admin que active la suscripción.'}
        </p>
        {esAdmin && (
          <Button size="sm" asChild>
            <Link to="/suscripcion">Suscribirme</Link>
          </Button>
        )}
      </div>
    )
  }

  // Prueba vigente: solo al Admin, que es quien decide suscribirse.
  if (empresa.estado_suscripcion !== 'prueba' || !esAdmin) return null
  const dias = diasRestantes(empresa.prueba_termina)
  const urgente = dias <= 3

  return (
    <div
      role="status"
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2 text-sm',
        urgente ? 'bg-aviso-suave text-aviso-fuerte' : 'bg-muted/50 text-muted-foreground',
      )}
    >
      <Clock className="size-4 shrink-0" aria-hidden />
      <p className="flex-1">
        {dias <= 1 ? 'Tu prueba termina hoy.' : `Te quedan ${dias} días de prueba.`} Después, la cuenta queda en solo lectura hasta que te suscribas.
      </p>
      <Button size="sm" variant={urgente ? 'default' : 'outline'} asChild>
        <Link to="/suscripcion">Ver planes</Link>
      </Button>
    </div>
  )
}
