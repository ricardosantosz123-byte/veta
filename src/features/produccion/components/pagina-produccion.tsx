import { Navigate, NavLink, Route, Routes } from 'react-router'
import { Corte } from '@/features/produccion/components/corte'
import { Destajistas } from '@/features/produccion/components/destajistas'
import { PorProgramar } from '@/features/produccion/components/por-programar'
import { TableroProduccion } from '@/features/produccion/components/tablero-produccion'
import { cn } from '@/lib/utils'

const PESTANAS = [
  { ruta: '', nombre: 'Tablero' },
  { ruta: 'programar', nombre: 'Por programar' },
  { ruta: 'destajistas', nombre: 'Destajistas' },
  { ruta: 'corte', nombre: 'Corte semanal' },
]

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Producción</h1>
      <nav aria-label="Secciones de producción" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex w-max gap-1 rounded-lg bg-muted p-1">
          {PESTANAS.map((p) => (
            <li key={p.ruta}>
              <NavLink
                to={p.ruta ? `/produccion/${p.ruta}` : '/produccion'}
                end
                className={({ isActive }) =>
                  cn(
                    'block rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    isActive && 'bg-background text-foreground shadow-sm',
                  )
                }
              >
                {p.nombre}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      {children}
    </div>
  )
}

export default function PaginaProduccion() {
  return (
    <Routes>
      <Route index element={<Marco><TableroProduccion /></Marco>} />
      <Route path="programar" element={<Marco><PorProgramar /></Marco>} />
      <Route path="destajistas" element={<Marco><Destajistas /></Marco>} />
      <Route path="corte" element={<Marco><Corte /></Marco>} />
      <Route path="*" element={<Navigate to="/produccion" replace />} />
    </Routes>
  )
}
