import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface EmpresaOpcion {
  id: string
  nombre: string
  rol: string
}

interface Props {
  empresas: EmpresaOpcion[]
  activaId: string | null
  onElegir?: (id: string) => void
}

// Fase 0: solo la interfaz. En la Fase 1 el contexto EmpresaActiva le pasa las membresías del usuario.
export function SelectorEmpresa({ empresas, activaId, onElegir }: Props) {
  const activa = empresas.find((e) => e.id === activaId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 max-w-64 gap-2 px-2" aria-label="Cambiar empresa activa">
          <Building2 className="size-4 text-muted-foreground" aria-hidden />
          <span className="truncate font-medium">{activa?.nombre ?? 'Sin empresa'}</span>
          <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Empresas</DropdownMenuLabel>
        {empresas.length === 0 ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">Inicia sesión para ver tus empresas.</p>
        ) : (
          empresas.map((e) => (
            <DropdownMenuItem key={e.id} onSelect={() => onElegir?.(e.id)}>
              <span className="flex-1 truncate">{e.nombre}</span>
              {e.id === activaId && <Check className="size-4" aria-hidden />}
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <Plus aria-hidden />
          Crear empresa
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
