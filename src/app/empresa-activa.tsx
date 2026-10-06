import { useQuery } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/auth-provider'
import { puede, type Capacidad, type Rol } from '@/lib/permisos'
import { supabase } from '@/lib/supabase'

const CLAVE = 'veta.empresa'

async function leerMembresias(userId: string) {
  const { data, error } = await supabase
    .from('miembros')
    .select(
      'id, rol, destajista_id, empresa:empresas(id, nombre, slug, logo_path, color_marca, estado_suscripcion, prueba_termina)',
    )
    .eq('user_id', userId)
    .eq('activo', true)
    .order('created_at')
  if (error) throw error
  return data
}

export type Membresia = Awaited<ReturnType<typeof leerMembresias>>[number]
export type EmpresaResumen = Membresia['empresa']

interface EmpresaActivaContexto {
  membresias: Membresia[]
  cargando: boolean
  /** Error al leer las membresías: no es lo mismo que no tener ninguna. */
  error: unknown
  reintentar: () => void
  empresa: EmpresaResumen | null
  rol: Rol | null
  /** false con la prueba vencida o la suscripción cancelada: la cuenta queda en solo lectura. */
  puedeEscribir: boolean
  elegir: (empresaId: string) => void
}

const Contexto = createContext<EmpresaActivaContexto | null>(null)

function leerGuardada(): string | null {
  try {
    return localStorage.getItem(CLAVE)
  } catch {
    return null
  }
}

export function EmpresaActivaProvider({ children }: { children: ReactNode }) {
  const { user, cargando: cargandoAuth } = useAuth()
  const [elegida, setElegida] = useState<string | null>(leerGuardada)

  // Se lee hasta que aceptar_invitaciones() terminó: si no, un invitado recién registrado
  // obtendría una lista vacía y la app lo mandaría al asistente de alta.
  const membresias = useQuery({
    queryKey: ['membresias', user?.id],
    queryFn: () => leerMembresias(user!.id),
    enabled: !!user && !cargandoAuth,
  })

  const lista = useMemo(() => membresias.data ?? [], [membresias.data])
  const activa = lista.find((m) => m.empresa.id === elegida) ?? lista[0] ?? null
  const empresaId = activa?.empresa.id ?? null

  const escritura = useQuery({
    queryKey: ['puede_escribir', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('puede_escribir', { p_empresa: empresaId! })
      if (error) throw error
      return data
    },
    enabled: !!empresaId,
    staleTime: 5 * 60_000,
  })

  const elegir = useCallback((id: string) => {
    try {
      localStorage.setItem(CLAVE, id)
    } catch {
      // sin persistencia: la elección dura esta sesión
    }
    setElegida(id)
  }, [])

  const valor: EmpresaActivaContexto = {
    membresias: lista,
    cargando: !!user && membresias.isPending,
    error: membresias.error,
    reintentar: () => void membresias.refetch(),
    empresa: activa?.empresa ?? null,
    rol: activa?.rol ?? null,
    // Mientras se consulta, se asume que sí: la base rechaza de todos modos si no.
    puedeEscribir: escritura.data ?? true,
    elegir,
  }

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useEmpresaActiva() {
  const ctx = useContext(Contexto)
  if (!ctx) throw new Error('useEmpresaActiva debe usarse dentro de <EmpresaActivaProvider>')
  return ctx
}

/** ¿El rol actual tiene esta capacidad? Solo para la interfaz (PRD §4). */
// eslint-disable-next-line react/only-export-components
export function usePuede(capacidad: Capacidad): boolean {
  return puede(useEmpresaActiva().rol, capacidad)
}

/** Capacidad del rol y, además, la cuenta no está en solo lectura. Úsalo para habilitar botones de acción. */
// eslint-disable-next-line react/only-export-components
export function usePuedeEditar(capacidad: Capacidad): boolean {
  const { rol, puedeEscribir } = useEmpresaActiva()
  return puedeEscribir && puede(rol, capacidad)
}

/** true si la cuenta activa está en solo lectura (prueba vencida o suscripción no activa). */
// eslint-disable-next-line react/only-export-components
export function useSoloLectura(): boolean {
  return !useEmpresaActiva().puedeEscribir
}
