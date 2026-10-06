import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Switch } from '@/components/ui/switch'
import { crearPedido, type Cotizacion, type Renglon } from '@/features/cotizaciones/api'
import { mensajeError } from '@/lib/errores'
import { moneda } from '@/lib/formato'

interface Props {
  abierto: boolean
  onCerrar: () => void
  cotizacion: Cotizacion
  renglones: Renglon[]
  onConvertida: () => Promise<unknown>
}

/** Venta total o por partes: los renglones elegidos pasan a un pedido nuevo (crear_pedido_desde_cotizacion). */
export function DialogoConvertir({ abierto, onCerrar, cotizacion: c, renglones, onConvertida }: Props) {
  const disponibles = renglones.filter((r) => !r.vendido)
  const [elegidos, setElegidos] = useState<string[]>(disponibles.map((r) => r.id))
  const [envio, setEnvio] = useState(Number(c.envio) > 0)
  const [compromiso, setCompromiso] = useState('')

  const convertir = useMutation({
    mutationFn: () => crearPedido(c.id!, elegidos, envio, compromiso || null),
    onSuccess: async (p) => {
      await onConvertida()
      toast.success(p.folio ? `Pedido P-${p.folio} creado` : 'Pedido creado')
      onCerrar()
    },
  })

  const alternar = (id: string, v: boolean) => setElegidos((e) => (v ? [...e, id] : e.filter((x) => x !== id)))

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Convertir en pedido</DialogTitle>
          <DialogDescription>Elige qué se vende. Lo que no elijas queda en la cotización para venderlo después.</DialogDescription>
        </DialogHeader>

        <ul className="grid gap-2">
          {disponibles.map((r) => {
            const id = `conv-${r.id}`
            return (
              <li key={r.id} className="flex items-start gap-3 rounded-xl border p-3">
                <Checkbox id={id} checked={elegidos.includes(r.id)} onCheckedChange={(v) => alternar(r.id, !!v)} />
                <Label htmlFor={id} className="grid flex-1 gap-0.5 font-normal">
                  <span className="font-medium">
                    {r.cantidad} × {r.descripcion}
                  </span>
                  {r.opciones_texto && <span className="text-sm text-muted-foreground">{r.opciones_texto}</span>}
                </Label>
                <span className="text-sm tabular">{moneda(r.importe)}</span>
              </li>
            )
          })}
        </ul>

        {Number(c.envio) > 0 && (
          <label className="flex items-center justify-between gap-4 rounded-xl border p-3">
            <span className="text-sm">
              Incluir el envío de <span className="tabular">{moneda(c.envio)}</span>
            </span>
            <Switch checked={envio} onCheckedChange={setEnvio} />
          </label>
        )}
        <div className="grid max-w-xs gap-2">
          <Label htmlFor="conv-fecha">Fecha compromiso (opcional)</Label>
          <Input id="conv-fecha" type="date" value={compromiso} onChange={(e) => setCompromiso(e.target.value)} />
        </div>

        {convertir.isError && (
          <p role="alert" className="text-sm text-destructive">
            {mensajeError(convertir.error)}
          </p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={() => convertir.mutate()} disabled={elegidos.length === 0 || convertir.isPending}>
            {convertir.isPending
              ? 'Creando pedido…'
              : elegidos.length === disponibles.length
                ? 'Vender todo'
                : `Vender ${elegidos.length} de ${disponibles.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
