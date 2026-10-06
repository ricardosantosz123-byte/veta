import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ExternalLink, Unplug } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { usePuedeEditar } from '@/app/empresa-activa'
import { Campo } from '@/components/campo'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { conectarMercadoPago, desconectarMercadoPago } from '@/features/ajustes/api'
import { leerConexionMp } from '@/features/pedidos/api'
import { mensajeError } from '@/lib/errores'

const PASOS = [
  <>
    Entra a{' '}
    <a href="https://www.mercadopago.com.mx/developers/panel/app" target="_blank" rel="noreferrer" className="font-medium underline underline-offset-4">
      Mercado Pago Developers <ExternalLink className="inline size-3.5" aria-hidden />
    </a>{' '}
    con la cuenta de Mercado Pago de tu negocio.
  </>,
  <>
    Clic en <strong>Crear aplicación</strong>. Nombre: “Veta”. Tipo de solución: <strong>Pagos online</strong>. Producto: <strong>Checkout Pro</strong>.
  </>,
  <>
    Dentro de la aplicación, abre <strong>Credenciales de producción</strong> y copia el <strong>Access Token</strong> (empieza con <code>APP_USR-</code>).
  </>,
  <>Pégalo aquí abajo y da clic en Conectar. Lo verificamos con Mercado Pago y lo guardamos en el servidor, fuera del navegador: nadie de tu equipo lo vuelve a ver.</>,
]

/** Ajustes > Cobros en línea (Admin): conectar la cuenta de Mercado Pago de la mueblería (PRD §5.5). */
export function AjustesCobros({ empresaId }: { empresaId: string }) {
  const queryClient = useQueryClient()
  const editar = usePuedeEditar('configurar_empresa')
  const conexion = useQuery({ queryKey: ['mercado-pago', empresaId], queryFn: () => leerConexionMp(empresaId) })
  const [token, setToken] = useState('')
  const [confirmando, setConfirmando] = useState(false)

  const refrescar = () => queryClient.invalidateQueries({ queryKey: ['mercado-pago', empresaId] })
  const conectar = useMutation({
    mutationFn: () => {
      if (!token.trim()) throw new Error('Pega el Access Token de Mercado Pago.')
      return conectarMercadoPago(empresaId, token)
    },
    onSuccess: async (r) => {
      setToken('')
      await refrescar()
      toast.success(`Mercado Pago conectado: ${r.cuenta}`)
    },
  })
  const desconectar = useMutation({
    mutationFn: () => desconectarMercadoPago(empresaId),
    onSuccess: async () => {
      setConfirmando(false)
      await refrescar()
      toast.success('Mercado Pago desconectado')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })

  if (conexion.isPending) return <Skeleton className="h-48 rounded-xl" />
  if (conexion.error) return <p className="text-sm text-destructive">{mensajeError(conexion.error)}</p>

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cobros en línea con Mercado Pago</CardTitle>
        <CardDescription>
          Genera links de pago para el anticipo o el saldo de cada pedido. El dinero llega directo a tu cuenta de Mercado Pago y el pago se registra solo en el pedido.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        {conexion.data.mp_conectado ? (
          <>
            <p role="status" className="flex items-center gap-2 rounded-xl border p-4 text-sm">
              <CheckCircle2 className="size-5 shrink-0" aria-hidden />
              <span>
                Conectado con la cuenta <strong>{conexion.data.mp_cuenta ?? 'de Mercado Pago'}</strong>. Ya puedes generar links desde cada pedido.
              </span>
            </p>
            {editar && (
              <Button variant="outline" className="justify-self-start" onClick={() => setConfirmando(true)}>
                <Unplug aria-hidden /> Desconectar
              </Button>
            )}
          </>
        ) : (
          <>
            <ol className="grid list-decimal gap-2 pl-5 text-sm">
              {PASOS.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ol>
            <form
              noValidate
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                conectar.mutate()
              }}
            >
              <Campo id="mp-token" etiqueta="Access Token de producción" error={conectar.isError ? mensajeError(conectar.error) : undefined} ayuda="Para probar, usa el Access Token de un usuario vendedor de prueba.">
                <Input
                  id="mp-token"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="APP_USR-…"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={!editar}
                  aria-invalid={conectar.isError}
                  aria-describedby="mp-token-nota"
                />
              </Campo>
              <Button type="submit" className="justify-self-start" disabled={!editar || conectar.isPending}>
                {conectar.isPending ? 'Verificando con Mercado Pago…' : 'Conectar'}
              </Button>
            </form>
          </>
        )}
      </CardContent>
      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desconectar Mercado Pago?</AlertDialogTitle>
            <AlertDialogDescription>Se borra el token guardado y se cancelan los links de pago activos. Los pagos ya registrados no cambian.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={() => desconectar.mutate()} disabled={desconectar.isPending}>
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
