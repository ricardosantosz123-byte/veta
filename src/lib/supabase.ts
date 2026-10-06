import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Copia .env.example a .env.local y llénalas.')
}

// Solo la llave pública (anon / publishable). La seguridad real vive en RLS.
export const supabase = createClient<Database>(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

export type Tablas = Database['public']['Tables']
export type Fila<T extends keyof Tablas> = Tablas[T]['Row']
export type Enum<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
