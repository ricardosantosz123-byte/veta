import { useMutation } from '@tanstack/react-query'
import { Mail, MessageCircle } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useEmpresaActiva } from '@/app/empresa-activa'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { nombreCompleto } from '@/features/clientes/api'
import {
  actualizarCotizacion,
  enviarPorCorreo,
  subirPdf,
  urlFirmada,
  type Cotizacion,
  type Renglon,
} from '@/features/cotizaciones/api'
import { nombreArchivo, prepararPdfCotizacion } from '@/features/cotizaciones/pdf/preparar'
import { mensajeError } from '@/lib/errores'
import { fecha, moneda } from '@/lib/formato'
import { telefonoLegible } from '@/lib/telefono'
import { enlaceWhatsApp, mensajeCotizacion } from '@/lib/whatsapp'

interface Props {
  abierto: boolean
  onCerrar: () => void
  cotizacion: Cotizacion
  renglones: Renglon[]
  onEnviada: () => Promise<unknown>
}

export function DialogoEnviar({ abierto, onCerrar, cotizacion: c, renglones, onEnviada }: Props) {
  const { empresa } = useEmpresaActiva()
  const cliente = c.cliente
  const nombreCliente = cliente ? nombreCompleto(cliente) : ''
  // El PDF se genera y sube una sola vez por apertura del diálogo.
  const subido = useRef<string | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)

  async function pdfSubido() {
    if (subido.current) return subido.current
    const blob = await prepararPdfCotizacion(c, renglones)
    subido.current = await subirPdf(empresa!.id, c.id!, c.folio!, blob)
    return subido.current
  }

  async function marcarEnviada() {
    if (c.estado === 'borrador') {
      await actualizarCotizacion(c.id!, { estado: 'enviada' })
      await onEnviada()
    }
  }

  const prepararWhatsApp = useMutation({
    mutationFn: async () => {
      const ruta = await pdfSubido()
      const enlace = await urlFirmada(ruta, nombreArchivo(c.folio!, nombreCliente))
      return mensajeCotizacion({
        cliente: cliente?.nombre ?? '',
        empresa: empresa!.nombre,
        folio: c.folio!,
        total: moneda(c.total),
        vigencia: fecha(c.vigencia_hasta),
        ivaIncluido: !!c.precios_con_iva,
        enlacePdf: enlace,
      })
    },
    onSuccess: setMensaje,
  })

  const correo = useMutation({
    mutationFn: async () => enviarPorCorreo(c.id!, await pdfSubido()),
    onSuccess: async (r) => {
      if (r.correo === 'enviado') {
        toast.success(`Cotización enviada a ${cliente?.email}`)
        await onEnviada()
        onCerrar()
      } else if (r.correo === 'no_configurado') {
        toast.info('El envío de correos aún no está configurado. Mándala por WhatsApp.')
      } else {
        toast.error('No se pudo enviar el correo. Intenta de nuevo o mándala por WhatsApp.')
      }
    },
  })

  const ocupado = prepararWhatsApp.isPending || correo.isPending

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && !ocupado && onCerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar cotización C-{c.folio}</DialogTitle>
          <DialogDescription>
            A {nombreCliente} · {moneda(c.total)}
          </DialogDescription>
        </DialogHeader>

        <section className="grid gap-3 rounded-xl border p-4" aria-labelledby="enviar-wa">
          <div className="flex items-center gap-2">
            <MessageCircle className="size-4" aria-hidden />
            <h3 id="enviar-wa" className="font-medium">
              WhatsApp
            </h3>
            <span className="ml-auto text-sm text-muted-foreground">{cliente?.telefono ? telefonoLegible(cliente.telefono) : 'Sin teléfono'}</span>
          </div>
          {mensaje === null ? (
            <>
              <p className="text-sm text-muted-foreground">
                Subimos el PDF y armamos el mensaje con un enlace de descarga que dura 15 días.
                {!cliente?.telefono && ' Como el cliente no tiene teléfono, WhatsApp te pedirá elegir el contacto.'}
              </p>
              <Button variant="outline" onClick={() => prepararWhatsApp.mutate()} disabled={ocupado}>
                {prepararWhatsApp.isPending ? 'Preparando PDF…' : 'Preparar mensaje'}
              </Button>
            </>
          ) : (
            <>
              <Textarea aria-label="Mensaje" rows={8} value={mensaje} onChange={(e) => setMensaje(e.target.value)} className="text-sm" />
              <Button asChild>
                <a
                  href={enlaceWhatsApp(mensaje, cliente?.telefono)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    void marcarEnviada().catch((e) => toast.error(mensajeError(e)))
                    onCerrar()
                  }}
                >
                  <MessageCircle aria-hidden /> Abrir WhatsApp
                </a>
              </Button>
            </>
          )}
          {prepararWhatsApp.isError && (
            <p role="alert" className="text-sm text-destructive">
              {mensajeError(prepararWhatsApp.error)}
            </p>
          )}
        </section>

        <section className="grid gap-3 rounded-xl border p-4" aria-labelledby="enviar-correo">
          <div className="flex items-center gap-2">
            <Mail className="size-4" aria-hidden />
            <h3 id="enviar-correo" className="font-medium">
              Correo con PDF adjunto
            </h3>
            <span className="ml-auto truncate text-sm text-muted-foreground">{cliente?.email ?? 'Sin correo'}</span>
          </div>
          <Button variant="outline" onClick={() => correo.mutate()} disabled={ocupado || !cliente?.email}>
            {correo.isPending ? 'Enviando…' : 'Enviar por correo'}
          </Button>
          {!cliente?.email && <p className="text-sm text-muted-foreground">Agrega el correo del cliente para usar esta opción.</p>}
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
