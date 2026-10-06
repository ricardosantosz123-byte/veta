import { useQuery } from '@tanstack/react-query'
import { Check, ChevronsUpDown, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useEmpresaActiva, usePuedeEditar } from '@/app/empresa-activa'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { leerClientes, nombreCompleto } from '@/features/clientes/api'
import { DialogoCliente } from '@/features/clientes/components/dialogo-cliente'
import { telefonoLegible } from '@/lib/telefono'
import { normalizar } from '@/lib/texto'
import { cn } from '@/lib/utils'

interface Props {
  id?: string
  valor: string | null
  onCambiar: (clienteId: string) => void
  disabled?: boolean
  className?: string
}

/** Buscar un cliente por nombre, empresa o teléfono, o crearlo ahí mismo. */
export function BuscadorCliente({ id, valor, onCambiar, disabled, className }: Props) {
  const { empresa } = useEmpresaActiva()
  const crear = usePuedeEditar('editar_clientes')
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [nuevo, setNuevo] = useState<string | null>(null)
  const clientes = useQuery({ queryKey: ['clientes', empresa!.id], queryFn: () => leerClientes(empresa!.id) })
  const elegido = clientes.data?.find((c) => c.id === valor)

  return (
    <>
      <Popover open={abierto} onOpenChange={setAbierto}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={abierto}
            disabled={disabled}
            className={cn('w-full justify-between font-normal', className)}
          >
            <span className={cn('truncate', !elegido && 'text-muted-foreground')}>
              {elegido ? nombreCompleto({ nombre: elegido.nombre ?? '', apellidos: elegido.apellidos }) : 'Buscar o agregar cliente'}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-72 p-0" align="start">
          <Command
            filter={(value, search) => {
              const c = clientes.data?.find((x) => x.id === value)
              if (!c) return value === '__nuevo__' ? 1 : 0
              const q = normalizar(search)
              const digitos = search.replace(/\D/g, '')
              const texto = normalizar(`${c.nombre} ${c.apellidos} ${c.empresa_cliente ?? ''}`)
              return texto.includes(q) || (digitos.length >= 4 && (c.telefono ?? '').includes(digitos)) ? 1 : 0
            }}
          >
            <CommandInput placeholder="Nombre, empresa o teléfono" value={texto} onValueChange={setTexto} />
            <CommandList>
              <CommandEmpty>{clientes.isPending ? 'Cargando…' : 'Sin coincidencias.'}</CommandEmpty>
              <CommandGroup>
                {clientes.data?.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.id!}
                    onSelect={() => {
                      onCambiar(c.id!)
                      setAbierto(false)
                    }}
                  >
                    <span className="grid flex-1 leading-tight">
                      <span className="truncate">{nombreCompleto({ nombre: c.nombre ?? '', apellidos: c.apellidos })}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {[c.empresa_cliente, c.telefono && telefonoLegible(c.telefono)].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    {c.id === valor && <Check className="size-4" aria-hidden />}
                  </CommandItem>
                ))}
              </CommandGroup>
              {crear && (
                <CommandGroup forceMount>
                  <CommandItem
                    value="__nuevo__"
                    forceMount
                    onSelect={() => {
                      setNuevo(texto)
                      setAbierto(false)
                    }}
                  >
                    <UserPlus aria-hidden />
                    {texto.trim() ? `Agregar "${texto.trim()}"` : 'Agregar cliente nuevo'}
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {nuevo !== null && (
        <DialogoCliente
          abierto
          nombreInicial={nuevo}
          onCerrar={() => setNuevo(null)}
          onGuardado={(c) => {
            onCambiar(c.id)
            setTexto('')
          }}
        />
      )}
    </>
  )
}
