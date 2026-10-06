import { useState, type FormEvent } from 'react'
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
import { Label } from '@/components/ui/label'
import { mensajeError } from '@/lib/errores'

interface Props {
  abierto: boolean
  titulo: string
  descripcion?: string
  etiqueta: string
  valorInicial?: string
  textoBoton?: string
  onCerrar: () => void
  onGuardar: (nombre: string) => Promise<unknown>
}

/** Diálogo de un solo campo para crear o renombrar (categoría, etapa, grupo…). */
export function DialogoNombre({ abierto, titulo, descripcion, etiqueta, valorInicial = '', textoBoton = 'Guardar', onCerrar, onGuardar }: Props) {
  const [nombre, setNombre] = useState(valorInicial)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const limpio = nombre.trim()
    if (limpio.length < 1) return setError('Escribe un nombre.')
    if (limpio.length > 80) return setError('Usa como máximo 80 caracteres.')
    setGuardando(true)
    try {
      await onGuardar(limpio)
      onCerrar()
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={enviar} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="dialogo-nombre">{etiqueta}</Label>
            <Input
              id="dialogo-nombre"
              autoFocus
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value)
                setError(null)
              }}
              aria-invalid={!!error}
              aria-describedby="dialogo-nombre-nota"
            />
            {error && (
              <p id="dialogo-nombre-nota" role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? 'Guardando…' : textoBoton}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
