import { Outlet } from 'react-router'
import { BarraLateral } from '@/app/layout/barra-lateral'
import { MenuUsuario } from '@/app/layout/menu-usuario'
import { SelectorEmpresa } from '@/app/layout/selector-empresa'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { BannerPrueba } from '@/features/suscripcion/banner-prueba'

export function AppLayout() {
  return (
    <SidebarProvider>
      <BarraLateral />
      <SidebarInset>
        <div className="sticky top-0 z-10 bg-background">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <SidebarTrigger className="-ml-1" aria-label="Mostrar u ocultar menú" />
            <Separator orientation="vertical" className="mr-1 data-vertical:h-5 data-vertical:self-center" />
            <SelectorEmpresa />
            <div className="flex-1" />
            <MenuUsuario />
          </header>
          <BannerPrueba />
        </div>
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
