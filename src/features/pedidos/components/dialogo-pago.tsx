import { useMutation } from '@tanstack/react-query'
import { Camera, FileText, Paperclip, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useEmpresaActiva } from '@/app/empresa-activa'
import { Campo } from '@/components/campo'
import { CampoMonto } from '@/components/campo-monto'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { nombreMetodo, registrarPago, subirPrivado, type Pedido } from '@/features/pedidos/api'
import { mensajeError } from '@/lib/errores'
import { hoyMx, moneda } from '@/lib/formato'
import type { Enum } from '@/lib/supabase'

const TIPOS = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
const MAX = 10 * 1024 * 1024
// Mercado Pago lo registra el webhook (Fase 8); a mano solo estos.
const METODOS: Enum<'metodo_pago'>[] = ['transferencia', 'efectivo', 'tarjeta', 'otro']

interface Props {
  abierto: boolean
  onCerrar: () => void
  pedido: Pedido
  onRegistrado: (pagoId: string) => Promise<unknown>
}

export function DialogoPago({ abierto, onCerrar, pedido: p, onRegistrado }: Props) {
  const { empresa } = useEmpresaActiva()
  const faltaAnticipo = Number(p.anticipo_faltante) > 0
  // Sugerencia: lo que falta del anticipo; si ya está cubierto, el saldo. Ambos los calcula la base.
  const sugerido = faltaAnticipo ? Number(p.anticipo_faltante) : Math.max(Number(p.saldo), 0)
  const [monto, setMonto] = useState<number | null>(sugerido || null)
  const [metodo, setMetodo] = useState<Enum<'metodo_pago'>>('transferencia')
  const [referencia, setReferencia] = useState('')
  const [fechaPago, setFechaPago] = useState(hoyMx())
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const camara = useRef<HTMLInputElement>(null)
  const archivo = useRef<HTMLInputElement>(null)

  const guardar = useMutation({
    mutationFn: async () => {
      if (!monto || monto <= 0) throw new Error('Escribe el monto.')
      if (monto > Number(p.saldo)) throw new Error(`El monto es mayor que el saldo (${moneda(p.saldo)}).`)
      if (fechaPago > hoyMx()) throw new Error('La fecha no puede ser futura.')
      const comprobante_path = comprobante ? await subirPrivado(empresa!.id, 'pagos', p.id!, comprobante, comprobante.name) : null
      return registrarPago(empresa!.id, p.id!, { monto, metodo, referencia: referencia.trim() || null, fecha: fechaPago, comprobante_path })
    },
    onSuccess: async (r) => {
      toast.success(`Pago registrado · Recibo R-${r.folio}`)
      await onRegistrado(r.id)
      onCerrar()
    },
    onError: (e) => setError(mensajeError(e)),
  })

  function elegirArchivo(f: File | undefined) {
    if (!f) return
    if (!TIPOS.includes(f.type)) return setError('Usa una foto (JPG, PNG, WEBP) o un PDF.')
    if (f.size > MAX) return setError('El archivo pesa más de 10 MB.')
    setError(null)
    setComprobante(f)
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && !guardar.isPending && onCerrar()}>
      <DialogContent className="sm:max-w-md">
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            guardar.mutate()
          }}
        >
          <DialogHeader>
            <DialogTitle>Registrar pago · P-{p.folio}</DialogTitle>
            <DialogDescription>
              Saldo {moneda(p.saldo)}
              {faltaAnticipo && ` · faltan ${moneda(p.anticipo_faltante)} para cubrir el anticipo`}
            </DialogDescription>
          </DialogHeader>

          <Campo id="pago-monto" etiqueta="Monto" ayuda={faltaAnticipo ? 'Sugerido: lo que falta del anticipo.' : 'Sugerido: el saldo.'}>
            <div className="flex gap-2">
              <CampoMonto id="pago-monto" valor={monto} onConfirmar={setMonto} autoFocus className="text-lg" aria-describedby="pago-monto-nota" />
              {faltaAnticipo && Number(p.saldo) > sugerido && (
                <Button type="button" variant="outline" onClick={() => setMonto(Number(p.saldo))}>
                  Saldo total
                </Button>
              )}
            </div>
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="pago-metodo" etiqueta="Forma de pago">
              <Select value={metodo} onValueChange={(v) => setMetodo(v as Enum<'metodo_pago'>)}>
                <SelectTrigger id="pago-metodo" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METODOS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {nombreMetodo[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            <Campo id="pago-fecha" etiqueta="Fecha">
              <Input id="pago-fecha" type="date" max={hoyMx()} value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} />
            </Campo>
          </div>

          <Campo id="pago-ref" etiqueta="Referencia (opcional)" ayuda="Clave de rastreo, últimos 4 dígitos de la tarjeta…">
            <Input id="pago-ref" autoComplete="off" value={referencia} onChange={(e) => setReferencia(e.target.value)} aria-describedby="pago-ref-nota" />
          </Campo>

          <div className="grid gap-2">
            <span className="text-sm font-medium">Comprobante (opcional)</span>
            {comprobante ? (
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <FileText className="size-4 text-muted-foreground" aria-hidden />
                <span className="flex-1 truncate">{comprobante.name}</span>
                <Button type="button" variant="ghost" size="icon" aria-label="Quitar comprobante" onClick={() => setComprobante(null)}>
                  <X aria-hidden />
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={() => camara.current?.click()}>
                  <Camera aria-hidden /> Tomar foto
                </Button>
                <Button type="button" variant="outline" onClick={() => archivo.current?.click()}>
                  <Paperclip aria-hidden /> Elegir archivo
                </Button>
              </div>
            )}
            {/* capture abre la cámara trasera del celular; el otro permite elegir una captura de pantalla o un PDF. */}
            <input
              ref={camara}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                elegirArchivo(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <input
              ref={archivo}
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                elegirArchivo(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onCerrar} disabled={guardar.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardar.isPending}>
              {guardar.isPending ? 'Registrando…' : `Registrar ${monto ? moneda(monto) : 'pago'}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
