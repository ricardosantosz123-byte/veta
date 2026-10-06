import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PackageSearch } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Campo } from '@/components/campo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { buscarPedidoPortal, ErrorPortal } from '@/features/portal/api'
import { MarcoPortal } from '@/features/portal/components/marco-portal'

/** Buscador público: folio + apellidos (sin importar acentos ni mayúsculas). */
export default function PaginaSeguimiento() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [folio, setFolio] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [faltante, setFaltante] = useState<'folio' | 'apellidos' | null>(null)

  const buscar = useMutation({
    mutationFn: () => buscarPedidoPortal(slug, folio, apellidos),
    onSuccess: (datos) => {
      queryClient.setQueryData(['portal', slug, datos.token], datos)
      navigate(`/${slug}/p/${datos.token}`)
    },
  })

  return (
    <MarcoPortal>
      <section className="grid gap-5 rounded-2xl border bg-card p-6 shadow-xs">
        <div className="grid justify-items-start gap-2">
          <PackageSearch className="size-8 text-muted-foreground" aria-hidden />
          <h1 className="text-2xl font-semibold tracking-tight">Sigue tu pedido</h1>
          <p className="text-sm text-muted-foreground">Escribe el folio de tu pedido y tus apellidos tal como los diste en la tienda. No importan los acentos ni las mayúsculas.</p>
        </div>
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!/\d/.test(folio)) return setFaltante('folio')
            if (apellidos.trim().length < 3) return setFaltante('apellidos')
            setFaltante(null)
            buscar.mutate()
          }}
        >
          <Campo id="seg-folio" etiqueta="Folio del pedido" error={faltante === 'folio' ? 'Escribe el folio, por ejemplo P-12.' : undefined} ayuda="Viene en tu recibo o en el mensaje de la tienda.">
            <Input id="seg-folio" inputMode="text" autoComplete="off" placeholder="P-12" value={folio} onChange={(e) => setFolio(e.target.value)} aria-invalid={faltante === 'folio'} aria-describedby="seg-folio-nota" className="h-12 text-base" />
          </Campo>
          <Campo id="seg-apellidos" etiqueta="Apellidos" error={faltante === 'apellidos' ? 'Escribe tus apellidos completos.' : undefined}>
            <Input id="seg-apellidos" autoComplete="family-name" placeholder="Pérez López" value={apellidos} onChange={(e) => setApellidos(e.target.value)} aria-invalid={faltante === 'apellidos'} aria-describedby="seg-apellidos-nota" className="h-12 text-base" />
          </Campo>
          {buscar.isError && (
            <p role="alert" className="text-sm text-destructive">
              {buscar.error instanceof ErrorPortal && buscar.error.tipo === 'no_encontrado' ? 'No encontramos un pedido con ese folio y apellidos. Revisa que estén completos y bien escritos.' : buscar.error.message}
            </p>
          )}
          <Button type="submit" size="lg" className="h-12 text-base" disabled={buscar.isPending}>
            {buscar.isPending ? 'Buscando…' : 'Ver mi pedido'}
          </Button>
        </form>
      </section>
    </MarcoPortal>
  )
}
