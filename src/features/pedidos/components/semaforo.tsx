import { cn } from '@/lib/utils'

const info = {
  atrasado: { color: 'bg-red-500', texto: (d: number) => `Atrasado ${Math.abs(d)} ${Math.abs(d) === 1 ? 'día' : 'días'}` },
  por_vencer: { color: 'bg-amber-500', texto: (d: number) => (d === 0 ? 'Vence hoy' : `Vence en ${d} ${d === 1 ? 'día' : 'días'}`) },
  a_tiempo: { color: 'bg-emerald-500', texto: (d: number) => `Faltan ${d} días` },
} as const

/** Semáforo de la fecha compromiso. El estado y los días los calcula la base (hora de la Ciudad de México). */
export function Semaforo({ semaforo, dias, className }: { semaforo: string | null; dias: number | null; className?: string }) {
  if (!semaforo || dias === null || !(semaforo in info)) return null
  const s = info[semaforo as keyof typeof info]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground', className)}>
      <span className={cn('size-2 rounded-full', s.color)} aria-hidden />
      {s.texto(dias)}
    </span>
  )
}
