/** Minúsculas y sin acentos, para buscar ("Lucía" encuentra "lucia"). */
export function normalizar(t: string | null | undefined) {
  return (t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}
