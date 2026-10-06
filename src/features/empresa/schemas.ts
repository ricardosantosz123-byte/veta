import { z } from 'zod'

export const COLOR_PREDETERMINADO = '#1d1d1f'

export const nombreEmpresa = z
  .string()
  .trim()
  .min(2, 'Escribe el nombre de tu empresa.')
  .max(80, 'Usa como máximo 80 caracteres.')

export const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Usa al menos 3 caracteres.')
  .max(40, 'Usa como máximo 40 caracteres.')
  .regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas sin acentos, números y guiones.')

export const colorMarca = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Usa un color en formato #RRGGBB.')

export const metodoPrecio = z.enum(['componentes', 'base_ajustes'])

export const pasoNombreSchema = z.object({ nombre: nombreEmpresa, slug })

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Usa como máximo ${max} caracteres.`)
    .transform((v) => (v === '' ? null : v))

// Ajustes > Empresa. Los porcentajes se capturan como 16 y se guardan como en la base (IVA 0.16, anticipo 60).
export const ajustesEmpresaSchema = z.object({
  nombre: nombreEmpresa,
  razon_social: textoOpcional(160),
  rfc: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === '' || /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/.test(v), 'El RFC no tiene un formato válido.')
    .transform((v) => (v === '' ? null : v)),
  telefono: textoOpcional(30),
  email: z
    .string()
    .trim()
    .refine((v) => v === '' || z.email().safeParse(v).success, 'Ese correo no es válido.')
    .transform((v) => (v === '' ? null : v.toLowerCase())),
  direccion: textoOpcional(300),
  iva_pct: z.coerce
    .number({ error: 'Escribe un número.' })
    .min(0, 'No puede ser negativo.')
    .max(99.99, 'Debe ser menor a 100.'),
  vigencia_cotizacion_dias: z.coerce
    .number({ error: 'Escribe un número.' })
    .int('Usa días completos.')
    .min(1, 'Al menos 1 día.')
    .max(180, 'Como máximo 180 días.'),
  anticipo_pct: z.coerce
    .number({ error: 'Escribe un número.' })
    .min(0, 'No puede ser negativo.')
    .max(100, 'Como máximo 100 %.'),
  condiciones_cotizacion: textoOpcional(2000),
})
