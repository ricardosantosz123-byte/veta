import { useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { mensajeError } from '@/lib/errores'

interface Props {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  descripcion: ReactNode
  textoBoton: string
  onConfirmar: (motivo: string) => Promise<unknown>
}

/** Confirmación destructiva que exige escribir el motivo (anular pago, cancelar pedido). */
export function DialogoMotivo({ abierto, onCerrar, titulo, descripcion, textoBoton, onConfirmar }: Props) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (motivo.trim().length < 3) return setError('Escribe el motivo.')
    setEnviando(true)
    try {
      await onConfirmar(motivo.trim())
      onCerrar()
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && !enviando && onCerrar()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={enviar} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            <DialogDescription>{descripcion}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Textarea id="motivo" autoFocus rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} aria-invalid={!!error} />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onCerrar} disabled={enviando}>
              Volver
            </Button>
            <Button type="submit" variant="destructive" disabled={enviando}>
              {enviando ? 'Guardando…' : textoBoton}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
