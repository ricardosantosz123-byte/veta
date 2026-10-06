import { useMutation } from '@tanstack/react-query'
import { Download, Mail, MessageCircle } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useEmpresaActiva } from '@/app/empresa-activa'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { descargar, nombreArchivo } from '@/features/cotizaciones/pdf/preparar'
import { enviarReciboPorCorreo, subirPrivado, urlPrivadaQuinceDias, type Pago, type Pedido } from '@/features/pedidos/api'
import { prepararPdfRecibo } from '@/features/pedidos/pdf/preparar-recibo'
import { mensajeError } from '@/lib/errores'
import { moneda } from '@/lib/formato'
import { telefonoLegible } from '@/lib/telefono'
import { enlaceWhatsApp } from '@/lib/whatsapp'

interface Props {
  abierto: boolean
  onCerrar: () => void
  pedido: Pedido
  pago: Pago
}

export function DialogoRecibo({ abierto, onCerrar, pedido: p, pago }: Props) {
  const { empresa } = useEmpresaActiva()
  const cliente = [p.cliente_nombre, p.cliente_apellidos].filter(Boolean).join(' ')
  const archivoNombre = nombreArchivo(pago.folio!, cliente, 'Recibo-R')
  const pdfBlob = useRef<Blob | null>(null)
  const subido = useRef<string | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)

  async function pdf() {
    pdfBlob.current ??= await prepararPdfRecibo(p, pago)
    return pdfBlob.current
  }
  async function pdfSubido() {
    subido.current ??= await subirPrivado(empresa!.id, 'recibos', p.id!, await pdf(), archivoNombre)
    return subido.current
  }

  const bajar = useMutation({
    mutationFn: async () => descargar(await pdf(), archivoNombre),
    onError: (e) => toast.error(`No se pudo generar el recibo: ${mensajeError(e)}`),
  })
  const whatsapp = useMutation({
    mutationFn: async () => {
      const enlace = await urlPrivadaQuinceDias(await pdfSubido(), archivoNombre)
      const saldo = Number(pago.saldo_despues ?? 0)
      return [
        `Hola ${p.cliente_nombre ?? ''}, recibimos tu pago de ${moneda(pago.monto)} para el pedido P-${p.folio}. ¡Gracias!`,
        '',
        saldo > 0 ? `Saldo pendiente: ${moneda(saldo)}` : saldo < 0 ? `Saldo a favor: ${moneda(-saldo)}` : 'Tu pedido quedó liquidado.',
        '',
        `Tu recibo R-${pago.folio}: ${enlace}`,
      ].join('\n')
    },
    onSuccess: setMensaje,
  })
  const correo = useMutation({
    mutationFn: async () => enviarReciboPorCorreo(pago.id!, await pdfSubido()),
    onSuccess: (r) => {
      if (r.correo === 'enviado') {
        toast.success(`Recibo enviado a ${p.cliente_email}`)
        onCerrar()
      } else if (r.correo === 'no_configurado') toast.info('El envío de correos aún no está configurado. Mándalo por WhatsApp.')
      else toast.error('No se pudo enviar el correo. Intenta de nuevo o mándalo por WhatsApp.')
    },
  })
  const ocupado = bajar.isPending || whatsapp.isPending || correo.isPending

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && !ocupado && onCerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Recibo R-{pago.folio}</DialogTitle>
          <DialogDescription>
            {moneda(pago.monto)} de {cliente} · pedido P-{p.folio}
          </DialogDescription>
        </DialogHeader>

        <Button variant="outline" onClick={() => bajar.mutate()} disabled={ocupado}>
          <Download aria-hidden /> {bajar.isPending ? 'Generando…' : 'Descargar PDF'}
        </Button>

        <section className="grid gap-3 rounded-xl border p-4" aria-labelledby="recibo-wa">
          <div className="flex items-center gap-2">
            <MessageCircle className="size-4" aria-hidden />
            <h3 id="recibo-wa" className="font-medium">
              WhatsApp
            </h3>
            <span className="ml-auto text-sm text-muted-foreground">{p.cliente_telefono ? telefonoLegible(p.cliente_telefono) : 'Sin teléfono'}</span>
          </div>
          {mensaje === null ? (
            <Button variant="outline" onClick={() => whatsapp.mutate()} disabled={ocupado}>
              {whatsapp.isPending ? 'Preparando…' : 'Preparar mensaje'}
            </Button>
          ) : (
            <>
              <Textarea aria-label="Mensaje" rows={7} value={mensaje} onChange={(e) => setMensaje(e.target.value)} className="text-sm" />
              <Button asChild>
                <a href={enlaceWhatsApp(mensaje, p.cliente_telefono)} target="_blank" rel="noreferrer" onClick={onCerrar}>
                  <MessageCircle aria-hidden /> Abrir WhatsApp
                </a>
              </Button>
            </>
          )}
          {whatsapp.isError && (
            <p role="alert" className="text-sm text-destructive">
              {mensajeError(whatsapp.error)}
            </p>
          )}
        </section>

        <section className="grid gap-3 rounded-xl border p-4" aria-labelledby="recibo-correo">
          <div className="flex items-center gap-2">
            <Mail className="size-4" aria-hidden />
            <h3 id="recibo-correo" className="font-medium">
              Correo
            </h3>
            <span className="ml-auto truncate text-sm text-muted-foreground">{p.cliente_email ?? 'Sin correo'}</span>
          </div>
          <Button variant="outline" onClick={() => correo.mutate()} disabled={ocupado || !p.cliente_email}>
            {correo.isPending ? 'Enviando…' : 'Enviar por correo'}
          </Button>
          {correo.isError && (
            <p role="alert" className="text-sm text-destructive">
              {mensajeError(correo.error)}
            </p>
          )}
        </section>
      </DialogContent>
    </Dialog>
  )
}
