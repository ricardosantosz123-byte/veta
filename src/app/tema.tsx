import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export type Tema = 'claro' | 'oscuro' | 'sistema'

const CLAVE = 'veta.tema'

interface TemaContexto {
  tema: Tema
  setTema: (tema: Tema) => void
}

const Contexto = createContext<TemaContexto | null>(null)

function leerTema(): Tema {
  try {
    const guardado = localStorage.getItem(CLAVE)
    if (guardado === 'claro' || guardado === 'oscuro' || guardado === 'sistema') return guardado
  } catch {
    // almacenamiento bloqueado: usar el del sistema
  }
  return 'sistema'
}

function aplicar(tema: Tema) {
  const oscuro =
    tema === 'oscuro' || (tema === 'sistema' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', oscuro)
}

export function TemaProvider({ children }: { children: ReactNode }) {
  const [tema, setTemaState] = useState<Tema>(leerTema)

  useEffect(() => {
    aplicar(tema)
    if (tema !== 'sistema') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const alCambiar = () => aplicar('sistema')
    media.addEventListener('change', alCambiar)
    return () => media.removeEventListener('change', alCambiar)
  }, [tema])

  const setTema = useCallback((nuevo: Tema) => {
    try {
      localStorage.setItem(CLAVE, nuevo)
    } catch {
      // sin persistencia; el tema aplica solo en esta sesión
    }
    setTemaState(nuevo)
  }, [])

  return <Contexto.Provider value={{ tema, setTema }}>{children}</Contexto.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useTema() {
  const ctx = useContext(Contexto)
  if (!ctx) throw new Error('useTema debe usarse dentro de <TemaProvider>')
  return ctx
}
