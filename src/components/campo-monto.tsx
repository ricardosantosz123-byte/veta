import { useState, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { leerMonto } from '@/lib/montos'
import { cn } from '@/lib/utils'

const fmt = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 4 })

interface Props extends Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'type'> {
  valor: number | null
  /** Se llama al salir del campo (o con Enter) solo si el valor cambió y es válido. */
  onConfirmar: (valor: number | null) => void
  permitirNegativo?: boolean
}

/**
 * Captura de montos: se escribe libre ("1800", "1,800.50") y se confirma al salir del campo.
 * Solo convierte el texto en número: las sumas y los precios los calcula la base de datos.
 */
export function CampoMonto({ valor, onConfirmar, permitirNegativo, className, ...props }: Props) {
  const [texto, setTexto] = useState(valor === null ? '' : fmt.format(valor))
  const [invalido, setInvalido] = useState(false)
  // Si el valor guardado cambia (p. ej. tras guardar o refrescar), el texto se actualiza.
  const [anterior, setAnterior] = useState(valor)
  if (valor !== anterior) {
    setAnterior(valor)
    setTexto(valor === null ? '' : fmt.format(valor))
    setInvalido(false)
  }

  function confirmar() {
    const n = leerMonto(texto)
    if (n !== null && (Number.isNaN(n) || (!permitirNegativo && n < 0))) return setInvalido(true)
    setInvalido(false)
    if (n !== valor) onConfirmar(n)
    else setTexto(valor === null ? '' : fmt.format(valor))
  }

  return (
    <Input
      inputMode="decimal"
      autoComplete="off"
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          ;(e.target as HTMLInputElement).blur()
        }
        if (e.key === 'Escape') setTexto(valor === null ? '' : fmt.format(valor))
      }}
      aria-invalid={invalido || undefined}
      className={cn('text-right tabular', className)}
      {...props}
    />
  )
}
