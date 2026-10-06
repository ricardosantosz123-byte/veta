import { Navigate, NavLink, Route, Routes } from 'react-router'
import { AsistenteModelo } from '@/features/catalogo/components/asistente-modelo'
import { FichaModelo } from '@/features/catalogo/components/ficha-modelo'
import { SeccionCategoriasEtapas } from '@/features/catalogo/components/seccion-categorias-etapas'
import { SeccionListas } from '@/features/catalogo/components/seccion-listas'
import { SeccionModelos } from '@/features/catalogo/components/seccion-modelos'
import { SeccionOpciones } from '@/features/catalogo/components/seccion-opciones'
import { SeccionSimulador } from '@/features/catalogo/components/seccion-simulador'
import { cn } from '@/lib/utils'

const PESTANAS = [
  { ruta: '', nombre: 'Modelos' },
  { ruta: 'opciones', nombre: 'Opciones' },
  { ruta: 'estructura', nombre: 'Categorías y etapas' },
  { ruta: 'listas', nombre: 'Listas de precios' },
  { ruta: 'simulador', nombre: 'Simulador' },
]

function ConPestanas({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Catálogo</h1>
      <nav aria-label="Secciones del catálogo" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex w-max gap-1 rounded-lg bg-muted p-1">
          {PESTANAS.map((p) => (
            <li key={p.ruta}>
              <NavLink
                to={p.ruta ? `/catalogo/${p.ruta}` : '/catalogo'}
                end
                className={({ isActive }) =>
                  cn(
                    'block rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
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

/** /catalogo/* — se carga aparte (lazy) desde el router. */
export default function PaginaCatalogo() {
  return (
    <Routes>
      <Route index element={<ConPestanas><SeccionModelos /></ConPestanas>} />
      <Route path="opciones" element={<ConPestanas><SeccionOpciones /></ConPestanas>} />
      <Route path="estructura" element={<ConPestanas><SeccionCategoriasEtapas /></ConPestanas>} />
      <Route path="listas" element={<ConPestanas><SeccionListas /></ConPestanas>} />
      <Route path="simulador" element={<ConPestanas><SeccionSimulador /></ConPestanas>} />
      <Route path="modelos/nuevo" element={<AsistenteModelo />} />
      <Route path="modelos/:id" element={<FichaModelo />} />
      <Route path="*" element={<Navigate to="/catalogo" replace />} />
    </Routes>
  )
}
