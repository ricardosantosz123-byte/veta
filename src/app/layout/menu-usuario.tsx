import { LogOut, Monitor, Moon, Sun, User } from 'lucide-react'
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

const temas: { valor: Tema; nombre: string; icono: typeof Sun }[] = [
  { valor: 'claro', nombre: 'Claro', icono: Sun },
  { valor: 'oscuro', nombre: 'Oscuro', icono: Moon },
  { valor: 'sistema', nombre: 'Según el sistema', icono: Monitor },
]

// Fase 0: sin sesión. En la Fase 1 muestra el nombre, el correo y el rol del usuario.
export function MenuUsuario() {
  const { tema, setTema } = useTema()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Menú de usuario">
          <Avatar className="size-8">
            <AvatarFallback>
              <User className="size-4" aria-hidden />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="text-sm font-medium">Invitado</p>
          <p className="text-xs font-normal text-muted-foreground">Sin sesión iniciada</p>
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
        <DropdownMenuItem disabled>
          <LogOut aria-hidden />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
