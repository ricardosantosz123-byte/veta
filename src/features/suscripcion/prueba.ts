const DIA = 86_400_000

/** Días completos que le quedan a la prueba (1 = vence en menos de 24 h). */
export function diasRestantes(pruebaTermina: string, ahora = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(pruebaTermina).getTime() - ahora) / DIA))
}
