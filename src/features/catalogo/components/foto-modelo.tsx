import { useMutation } from '@tanstack/react-query'
import { ImageUp, Sofa } from 'lucide-react'
import { useRef } from 'react'
import { toast } from 'sonner'
import { useEmpresaActiva } from '@/app/empresa-activa'
import { Button } from '@/components/ui/button'
import { actualizarModelo, subirFotoModelo } from '@/features/catalogo/api'
import { useRefrescarCatalogo } from '@/features/catalogo/hooks'
import { borrarArchivoPublico, LOGO_TIPOS, urlPublica, validarImagen } from '@/features/empresa/api'
import { mensajeError } from '@/lib/errores'
import { cn } from '@/lib/utils'

/** Miniatura de la foto del modelo (o un ícono si no tiene). */
export function MiniaturaModelo({ ruta, nombre, className }: { ruta: string | null; nombre: string; className?: string }) {
  const url = urlPublica(ruta)
  return (
    <div className={cn('flex items-center justify-center overflow-hidden rounded-xl bg-muted', className)}>
      {url ? <img src={url} alt={nombre} loading="lazy" className="size-full object-cover" /> : <Sofa className="size-1/3 text-muted-foreground/60" aria-hidden />}
    </div>
  )
}

export function FotoModelo({ modeloId, nombre, ruta, editar }: { modeloId: string; nombre: string; ruta: string | null; editar: boolean }) {
  const { empresa } = useEmpresaActiva()
  const refrescar = useRefrescarCatalogo()
  const input = useRef<HTMLInputElement>(null)

  const subir = useMutation({
    mutationFn: async (f: File) => {
      const nueva = await subirFotoModelo(empresa!.id, modeloId, f)
      await actualizarModelo(modeloId, { foto_path: nueva })
      if (ruta) await borrarArchivoPublico(ruta).catch(() => undefined)
    },
    onSuccess: async () => {
      await refrescar()
      toast.success('Foto actualizada')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })

  return (
    <div className="grid gap-3">
      <MiniaturaModelo ruta={ruta} nombre={nombre} className={cn('aspect-[4/3] w-full', subir.isPending && 'opacity-50')} />
      {editar && (
        <>
          <Button type="button" variant="outline" onClick={() => input.current?.click()} disabled={subir.isPending}>
            <ImageUp aria-hidden />
            {subir.isPending ? 'Subiendo…' : ruta ? 'Cambiar foto' : 'Subir foto'}
          </Button>
          <input
            ref={input}
            type="file"
            accept={LOGO_TIPOS.join(',')}
            className="sr-only"
            aria-label="Archivo de la foto"
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              const error = validarImagen(f)
              if (error) return toast.error(error)
              subir.mutate(f)
            }}
          />
        </>
      )}
    </div>
  )
}
