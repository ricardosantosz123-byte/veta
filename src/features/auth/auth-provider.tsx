import type { Session, User } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

interface AuthContexto {
  session: Session | null
  user: User | null
  /** true mientras se restaura la sesión o se aceptan las invitaciones pendientes del usuario. */
  cargando: boolean
  /** true después de que el enlace de recuperación abrió la app: hay que pedir la contraseña nueva. */
  recuperando: boolean
}

const Contexto = createContext<AuthContexto | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [iniciando, setIniciando] = useState(true)
  const [aceptadasPara, setAceptadasPara] = useState<string | null>(null)
  const [recuperando, setRecuperando] = useState(false)
  const enCurso = useRef<string | null>(null)

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((evento, nueva) => {
      setSession(nueva)
      setIniciando(false)
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true)
      if (evento === 'USER_UPDATED') setRecuperando(false)
      if (evento === 'SIGNED_OUT') {
        enCurso.current = null
        setAceptadasPara(null)
        setRecuperando(false)
        queryClient.clear()
      }

      // Al iniciar sesión (o al volver con sesión guardada) convierte invitaciones pendientes en membresías.
      // Fuera del callback: supabase-js no permite esperar otra llamada de Supabase aquí dentro.
      const uid = nueva?.user.id
      if (uid && enCurso.current !== uid) {
        enCurso.current = uid
        setTimeout(async () => {
          const { error } = await supabase.rpc('aceptar_invitaciones')
          if (error) console.error('aceptar_invitaciones', error)
          await queryClient.invalidateQueries({ queryKey: ['membresias'] })
          setAceptadasPara(uid)
        }, 0)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  const user = session?.user ?? null
  const cargando = iniciando || (!!user && aceptadasPara !== user.id)

  return <Contexto.Provider value={{ session, user, cargando, recuperando }}>{children}</Contexto.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useAuth() {
  const ctx = useContext(Contexto)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
