import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  icono: LucideIcon
  titulo: string
  descripcion: string
  accion?: string
  onAccion?: () => void
  accionDeshabilitada?: boolean
}

export function EstadoVacio({ icono: Icono, titulo, descripcion, accion, onAccion, accionDeshabilitada }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-muted">
        <Icono className="size-6 text-muted-foreground" aria-hidden />
      </div>
      <h2 className="text-base font-semibold">{titulo}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{descripcion}</p>
      {accion && (
        <Button className="mt-6" onClick={onAccion} disabled={accionDeshabilitada}>
          {accion}
        </Button>
      )}
    </div>
  )
}
