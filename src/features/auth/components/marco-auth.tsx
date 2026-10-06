import type { ReactNode } from 'react'
import { marca } from '@/config/marca'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  titulo: string
  descripcion?: ReactNode
  children: ReactNode
  pie?: ReactNode
}

export function MarcoAuth({ titulo, descripcion, children, pie }: Props) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-4">
      <div className="flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground">
          {marca.nombre.charAt(0)}
        </div>
        <span className="text-lg font-semibold">{marca.nombre}</span>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{titulo}</CardTitle>
          {descripcion && <CardDescription>{descripcion}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
      {pie && <div className="text-center text-sm text-muted-foreground">{pie}</div>}
    </div>
  )
}
