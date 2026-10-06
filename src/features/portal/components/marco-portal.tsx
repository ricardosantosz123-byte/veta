import type { ReactNode } from 'react'
import { urlLogo, type PortalPedido } from '@/features/portal/api'
import { marca } from '@/config/marca'
import { colorMarca } from '@/lib/color'

/** Marco del portal: barra con el color de la mueblería, logo y nombre; pie "Hecho con Veta". Móvil primero. */
export function MarcoPortal({ empresa, children }: { empresa?: PortalPedido['empresa'] | null; children: ReactNode }) {
  const acento = colorMarca(empresa?.color)
  const logo = urlLogo(empresa?.logo_path ?? null)
  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <div className="h-1.5" style={{ background: acento }} aria-hidden />
      <header className="mx-auto flex w-full max-w-lg items-center gap-3 px-4 pt-6 pb-2">
        {logo ? (
          <img src={logo} alt="" className="size-11 rounded-xl border bg-background object-contain p-1" />
        ) : empresa ? (
          <div className="flex size-11 items-center justify-center rounded-xl border bg-background text-lg font-semibold" aria-hidden>
            {empresa.nombre.slice(0, 1).toUpperCase()}
          </div>
        ) : null}
        {empresa && <p className="text-lg font-semibold tracking-tight">{empresa.nombre}</p>}
      </header>
      <main className="mx-auto grid w-full max-w-lg flex-1 content-start gap-4 px-4 pt-2 pb-10">{children}</main>
      <footer className="pb-6 text-center text-xs text-muted-foreground">
        Hecho con <span className="font-medium text-foreground">{marca.nombre}</span>
      </footer>
    </div>
  )
}
