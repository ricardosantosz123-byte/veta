import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useEmpresaActiva } from '@/app/empresa-activa'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { urlPublica } from '@/features/empresa/api'
import { nombreRol } from '@/lib/permisos'

function Logo({ ruta, nombre }: { ruta: string | null; nombre: string }) {
  const url = urlPublica(ruta)
  return url ? (
    <img src={url} alt="" className="size-5 shrink-0 rounded object-contain" />
  ) : (
    <Building2 className="size-4 shrink-0 text-muted-foreground" aria-label={nombre} />
  )
}

export function SelectorEmpresa() {
  const { membresias, empresa, rol, elegir } = useEmpresaActiva()
  const navigate = useNavigate()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 max-w-64 gap-2 px-2" aria-label="Cambiar empresa activa">
          <Logo ruta={empresa?.logo_path ?? null} nombre={empresa?.nombre ?? ''} />
          <span className="truncate font-medium">{empresa?.nombre ?? 'Sin empresa'}</span>
          {rol && <span className="hidden text-xs text-muted-foreground sm:inline">{nombreRol[rol]}</span>}
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Tus empresas</DropdownMenuLabel>
        {membresias.map((m) => (
          <DropdownMenuItem
            key={m.id}
            onSelect={() => {
              if (m.empresa.id === empresa?.id) return
              elegir(m.empresa.id)
              // Con otro rol, la pantalla actual podría no estar permitida: vuelve al inicio.
              navigate('/')
            }}
          >
            <Logo ruta={m.empresa.logo_path} nombre={m.empresa.nombre} />
            <span className="grid flex-1 leading-tight">
              <span className="truncate">{m.empresa.nombre}</span>
              <span className="text-xs text-muted-foreground">{nombreRol[m.rol]}</span>
            </span>
            {m.empresa.id === empresa?.id && <Check className="size-4" aria-hidden />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/bienvenida')}>
          <Plus aria-hidden />
          Crear otra empresa
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
