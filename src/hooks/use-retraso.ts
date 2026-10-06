import { useEffect, useState } from 'react'

/** Devuelve `valor` después de `ms` sin cambios (debounce). */
export function useRetraso<T>(valor: T, ms = 300): T {
  const [retrasado, setRetrasado] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setRetrasado(valor), ms)
    return () => clearTimeout(t)
  }, [valor, ms])
  return retrasado
}
