import { z } from 'zod'

const correo = z
  .string()
  .trim()
  .min(1, 'Escribe tu correo.')
  .pipe(z.email('Ese correo no es válido.'))
  .transform((v) => v.toLowerCase())

const contrasena = z.string().min(8, 'Usa al menos 8 caracteres.').max(72, 'Usa como máximo 72 caracteres.')

export const entrarSchema = z.object({
  email: correo,
  password: z.string().min(1, 'Escribe tu contraseña.'),
})

export const enlaceSchema = z.object({ email: correo })

export const registroSchema = z
  .object({ email: correo, password: contrasena, confirmar: z.string() })
  .refine((d) => d.password === d.confirmar, { path: ['confirmar'], message: 'Las contraseñas no coinciden.' })

export const recuperarSchema = z.object({ email: correo })

export const restablecerSchema = z
  .object({ password: contrasena, confirmar: z.string() })
  .refine((d) => d.password === d.confirmar, { path: ['confirmar'], message: 'Las contraseñas no coinciden.' })
