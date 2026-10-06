import { LogOut, Monitor, Moon, Sun } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useEmpresaActiva } from '@/app/empresa-activa'
import { useTema, type Tema } from '@/app/tema'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/features/auth/auth-provider'
import { mensajeError } from '@/lib/errores'
import { nombreRol } from '@/lib/permisos'
import { supabase } from '@/lib/supabase'

const temas: { valor: Tema; nombre: string; icono: typeof Sun }[] = [
  { valor: 'claro', nombre: 'Claro', icono: Sun },
  { valor: 'oscuro', nombre: 'Oscuro', icono: Moon },
  { valor: 'sistema', nombre: 'Según el sistema', icono: Monitor },
]

export function MenuUsuario() {
  const { tema, setTema } = useTema()
  const { user } = useAuth()
  const { empresa, rol } = useEmpresaActiva()
  const navigate = useNavigate()
  const email = user?.email ?? ''

  async function salir() {
    const { error } = await supabase.auth.signOut()
    if (error) return toast.error(mensajeError(error))
    navigate('/entrar', { replace: true })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Menú de usuario">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs font-medium uppercase">{email.slice(0, 2) || '?'}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="grid gap-0.5">
          <span className="truncate text-sm font-medium">{email}</span>
          {rol && empresa && (
            <span className="truncate text-xs font-normal text-muted-foreground">
              {nombreRol[rol]} en {empresa.nombre}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Tema</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={tema} onValueChange={(v) => setTema(v as Tema)}>
          {temas.map(({ valor, nombre, icono: Icono }) => (
            <DropdownMenuRadioItem key={valor} value={valor}>
              <Icono aria-hidden />
              {nombre}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={salir}>
          <LogOut aria-hidden />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
