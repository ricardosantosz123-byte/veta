import { isAuthError } from '@supabase/supabase-js'

// Traduce errores de Supabase (Auth, PostgREST, Storage) a mensajes claros en español.
// Los errores que lanzan nuestras funciones SQL ya vienen en español y se muestran tal cual.
const porCodigo: Record<string, string> = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  user_already_exists: 'Ya existe una cuenta con ese correo. Inicia sesión.',
  email_exists: 'Ya existe una cuenta con ese correo. Inicia sesión.',
  weak_password: 'La contraseña es muy débil. Usa al menos 8 caracteres.',
  same_password: 'La contraseña nueva debe ser distinta de la anterior.',
  email_not_confirmed: 'Confirma tu correo antes de entrar.',
  over_email_send_rate_limit: 'Se enviaron demasiados correos. Espera unos minutos e intenta de nuevo.',
  over_request_rate_limit: 'Demasiados intentos. Espera unos minutos e intenta de nuevo.',
  otp_expired: 'El enlace expiró o ya se usó. Pide uno nuevo.',
  signup_disabled: 'El registro está deshabilitado.',
  email_address_invalid: 'Ese correo no es válido.',
  session_not_found: 'Tu sesión expiró. Vuelve a entrar.',
  '23505': 'Ya existe un registro con esos datos.',
  '42501': 'No tienes permiso para hacer esto.',
}

export function mensajeError(error: unknown): string {
  if (!error) return 'Ocurrió un error inesperado.'
  if (isAuthError(error) && error.code && porCodigo[error.code]) return porCodigo[error.code]
  if (typeof error === 'object' && error !== null) {
    const { code, message } = error as { code?: string; message?: string }
    if (code && porCodigo[code]) return porCodigo[code]
    if (message?.includes('row-level security')) return 'No tienes permiso para hacer esto.'
    if (message === 'Failed to fetch') return 'Sin conexión. Revisa tu internet e intenta de nuevo.'
    if (message) return message
  }
  return 'Ocurrió un error inesperado.'
}
