import { ImageUp, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { LOGO_MAX_BYTES, LOGO_TIPOS } from '@/features/empresa/api'

interface Props {
  /** Archivo nuevo elegido (aún sin subir). */
  archivo: File | null
  /** URL del logo actual, si ya hay uno guardado. */
  actualUrl?: string | null
  onCambiar: (archivo: File | null) => void
  disabled?: boolean
}

export function SelectorLogo({ archivo, actualUrl, onCambiar, disabled }: Props) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const vistaPrevia = useMemo(() => (archivo ? URL.createObjectURL(archivo) : null), [archivo])
  useEffect(() => () => void (vistaPrevia && URL.revokeObjectURL(vistaPrevia)), [vistaPrevia])
  const url = vistaPrevia ?? actualUrl ?? null

  function elegir(f: File | undefined) {
    setError(null)
    if (!f) return
    if (!LOGO_TIPOS.includes(f.type)) return setError('Usa una imagen PNG, JPG, WEBP o SVG.')
    if (f.size > LOGO_MAX_BYTES) return setError('La imagen pesa más de 5 MB.')
    onCambiar(f)
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-4">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
          {url ? (
            <img src={url} alt="Logo de la empresa" className="size-full object-contain p-1" />
          ) : (
            <ImageUp className="size-6 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={disabled} onClick={() => input.current?.click()}>
            {url ? 'Cambiar logo' : 'Subir logo'}
          </Button>
          {archivo && (
            <Button type="button" variant="ghost" disabled={disabled} onClick={() => onCambiar(null)}>
              <X aria-hidden />
              Quitar
            </Button>
          )}
        </div>
        <input
          ref={input}
          id={id}
          type="file"
          accept={LOGO_TIPOS.join(',')}
          className="sr-only"
          aria-label="Archivo del logo"
          onChange={(e) => {
            elegir(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">PNG, JPG, WEBP o SVG de hasta 5 MB. Aparece en tus PDFs y en el portal.</p>
      )}
    </div>
  )
}

interface ColorProps {
  id: string
  valor: string
  onCambiar: (color: string) => void
  disabled?: boolean
}

export function SelectorColor({ id, valor, onCambiar, disabled }: ColorProps) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        aria-label="Elegir color"
        value={/^#[0-9a-fA-F]{6}$/.test(valor) ? valor : '#1d1d1f'}
        onChange={(e) => onCambiar(e.target.value)}
        disabled={disabled}
        className="size-10 cursor-pointer rounded-lg border bg-transparent p-1"
      />
      <input
        id={id}
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        disabled={disabled}
        maxLength={7}
        spellCheck={false}
        className="h-9 w-28 rounded-md border bg-transparent px-3 font-mono text-sm uppercase outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        aria-describedby={`${id}-nota`}
      />
    </div>
  )
}
