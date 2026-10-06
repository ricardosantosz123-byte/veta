import { z } from 'zod'

/**
 * Teléfono: acepta "33 1111 2222", "33-1111-2222", "+52 33 1111 2222", "521…".
 * La base lo guarda como 52 + 10 dígitos (formato wa.me); aquí solo se valida que tenga sentido.
 */
export function telefonoValido(texto: string) {
  const d = texto.replace(/\D/g, '')
  if (d.length === 10) return true
  if (d.length === 12 && d.startsWith('52')) return true
  if (d.length === 13 && d.startsWith('521')) return true
  return texto.trim().startsWith('+') && d.length >= 8 && d.length <= 15 // número de otro país
}

const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Usa como máximo ${max} caracteres.`)
    .transform((v) => (v === '' ? null : v))

export const clienteSchema = z.object({
  nombre: z.string().trim().min(1, 'Escribe el nombre.').max(80, 'Usa como máximo 80 caracteres.'),
  // Obligatorios: el cliente final busca su pedido en el portal con folio + apellidos.
  apellidos: z.string().trim().min(1, 'Escribe los apellidos: los usa el cliente para buscar su pedido.').max(80, 'Usa como máximo 80 caracteres.'),
  empresa_cliente: opcional(120),
  telefono: z
    .string()
    .trim()
    .refine((v) => v === '' || telefonoValido(v), 'Escribe 10 dígitos (puede llevar espacios, guiones o +52).')
    .transform((v) => (v === '' ? null : v)),
  email: z
    .string()
    .trim()
    .refine((v) => v === '' || z.email().safeParse(v).success, 'Ese correo no es válido.')
    .transform((v) => (v === '' ? null : v.toLowerCase())),
  direccion: opcional(300),
  notas: opcional(1000),
})
export type ClienteEntrada = z.input<typeof clienteSchema>
export type ClienteSalida = z.output<typeof clienteSchema>
