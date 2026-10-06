import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { useEmpresaActiva } from '@/app/empresa-activa'
import { Campo } from '@/components/campo'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { actualizarCliente, crearCliente, type Cliente } from '@/features/clientes/api'
import { clienteSchema, type ClienteEntrada, type ClienteSalida } from '@/features/clientes/schemas'
import { mensajeError } from '@/lib/errores'
import { telefonoLegible } from '@/lib/telefono'

interface Props {
  abierto: boolean
  onCerrar: () => void
  /** Para editar; sin él, crea uno nuevo. */
  cliente?: Cliente | null
  /** Texto inicial del nombre (p. ej. lo que se escribió en el buscador). */
  nombreInicial?: string
  onGuardado?: (c: { id: string; nombre: string; apellidos: string }) => void
}

function valoresIniciales(cliente: Cliente | null | undefined, nombreInicial = ''): ClienteEntrada {
  if (!cliente) {
    const [nombre, ...resto] = nombreInicial.trim().split(/\s+/)
    return { nombre: nombre ?? '', apellidos: resto.join(' '), empresa_cliente: '', telefono: '', email: '', direccion: '', notas: '' }
  }
  return {
    nombre: cliente.nombre ?? '',
    apellidos: cliente.apellidos ?? '',
    empresa_cliente: cliente.empresa_cliente ?? '',
    telefono: cliente.telefono ? telefonoLegible(cliente.telefono) : '',
    email: cliente.email ?? '',
    direccion: cliente.direccion ?? '',
    notas: cliente.notas ?? '',
  }
}

/** Alta rápida o edición de cliente. Se usa en Clientes y dentro del cotizador. */
export function DialogoCliente({ abierto, onCerrar, cliente, nombreInicial, onGuardado }: Props) {
  const { empresa } = useEmpresaActiva()
  const queryClient = useQueryClient()
  const form = useForm<ClienteEntrada, unknown, ClienteSalida>({
    resolver: zodResolver(clienteSchema),
    defaultValues: valoresIniciales(cliente, nombreInicial),
  })
  const { errors } = form.formState

  const guardar = useMutation({
    mutationFn: async (v: ClienteSalida) => {
      if (cliente?.id) {
        await actualizarCliente(cliente.id, v)
        return { id: cliente.id, nombre: v.nombre, apellidos: v.apellidos }
      }
      const c = await crearCliente(empresa!.id, v)
      return { id: c.id, nombre: c.nombre, apellidos: c.apellidos }
    },
    onSuccess: async (c) => {
      await queryClient.invalidateQueries({ queryKey: ['clientes', empresa!.id] })
      toast.success(cliente ? 'Cliente actualizado' : 'Cliente agregado')
      onGuardado?.(c)
      onCerrar()
    },
  })

  const campo = (id: keyof ClienteEntrada) => ({
    id: `cli-${id}`,
    'aria-describedby': `cli-${id}-nota`,
    'aria-invalid': !!errors[id],
    ...form.register(id),
  })

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={form.handleSubmit((v) => guardar.mutate(v))} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{cliente ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
            <DialogDescription>Solo nombre y apellidos son obligatorios.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="cli-nombre" etiqueta="Nombre" error={errors.nombre?.message}>
              <Input autoFocus autoComplete="off" {...campo('nombre')} />
            </Campo>
            <Campo id="cli-apellidos" etiqueta="Apellidos" error={errors.apellidos?.message}>
              <Input autoComplete="off" {...campo('apellidos')} />
            </Campo>
            <Campo id="cli-telefono" etiqueta="WhatsApp" error={errors.telefono?.message} ayuda="10 dígitos.">
              <Input type="tel" inputMode="tel" autoComplete="off" placeholder="33 1234 5678" {...campo('telefono')} />
            </Campo>
            <Campo id="cli-email" etiqueta="Correo" error={errors.email?.message}>
              <Input type="email" autoComplete="off" {...campo('email')} />
            </Campo>
            <Campo id="cli-empresa_cliente" etiqueta="Empresa (opcional)" error={errors.empresa_cliente?.message} ayuda="Despacho, hotel, desarrollador…" className="sm:col-span-2">
              <Input autoComplete="off" {...campo('empresa_cliente')} />
            </Campo>
            <Campo id="cli-direccion" etiqueta="Dirección (opcional)" error={errors.direccion?.message} className="sm:col-span-2">
              <Textarea rows={2} {...campo('direccion')} />
            </Campo>
            <Campo id="cli-notas" etiqueta="Notas internas (opcional)" error={errors.notas?.message} className="sm:col-span-2">
              <Textarea rows={2} {...campo('notas')} />
            </Campo>
          </div>
          {guardar.isError && (
            <p role="alert" className="text-sm text-destructive">
              {mensajeError(guardar.error)}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardar.isPending}>
              {guardar.isPending ? 'Guardando…' : cliente ? 'Guardar' : 'Agregar cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
