/** "1,800.50" → 1800.5 · "" → null · texto inválido → NaN. Solo interpreta lo que se escribe: no suma montos. */
export function leerMonto(texto: string): number | null {
  const limpio = texto.replace(/[$,\s]/g, '')
  if (limpio === '') return null
  return /^-?\d*\.?\d+$/.test(limpio) ? Number(limpio) : Number.NaN
}
