import { NavLink, useLocation } from 'react-router'
import { useEmpresaActiva } from '@/app/empresa-activa'
import { modulosDe, type Modulo } from '@/app/modulos'
import { marca } from '@/config/marca'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'

function Grupo({ titulo, items }: { titulo: string; items: Modulo[] }) {
  const { pathname } = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()
  if (items.length === 0) return null

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{titulo}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map(({ ruta, nombre, icono: Icono }) => (
            <SidebarMenuItem key={ruta}>
              <SidebarMenuButton asChild isActive={pathname.startsWith(ruta)} tooltip={nombre}>
                <NavLink to={ruta} onClick={() => isMobile && setOpenMobile(false)}>
                  <Icono aria-hidden />
                  <span>{nombre}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export function BarraLateral() {
  const { rol } = useEmpresaActiva()
  const visibles = modulosDe(rol)
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
                  {marca.nombre.charAt(0)}
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">{marca.nombre}</span>
                  <span className="truncate text-xs text-muted-foreground">{marca.lema}</span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <Grupo titulo="Operación" items={visibles.filter((m) => m.grupo === 'operacion')} />
        <Grupo titulo="Cuenta" items={visibles.filter((m) => m.grupo === 'cuenta')} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
