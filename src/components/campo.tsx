import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface Props {
  id: string
  etiqueta: string
  error?: string
  ayuda?: ReactNode
  className?: string
  children: ReactNode
}

// Etiqueta + control + ayuda o error. El control debe llevar el mismo `id` y `aria-describedby={`${id}-nota`}`.
export function Campo({ id, etiqueta, error, ayuda, className, children }: Props) {
  return (
    <div className={cn('grid gap-2', className)}>
      <Label htmlFor={id}>{etiqueta}</Label>
      {children}
      {error ? (
        <p id={`${id}-nota`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : ayuda ? (
        <p id={`${id}-nota`} className="text-sm text-muted-foreground">
          {ayuda}
        </p>
      ) : null}
    </div>
  )
}
