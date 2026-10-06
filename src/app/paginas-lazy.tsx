import { lazy, Suspense } from 'react'

// Módulos grandes: se descargan hasta que se visitan.
const Catalogo = lazy(() => import('@/features/catalogo/components/pagina-catalogo'))

function Cargando() {
  return <div className="mx-auto h-64 w-full max-w-5xl animate-pulse rounded-xl bg-muted" aria-busy="true" aria-label="Cargando" />
}

export function PaginaCatalogo() {
  return (
    <Suspense fallback={<Cargando />}>
      <Catalogo />
    </Suspense>
  )
}
