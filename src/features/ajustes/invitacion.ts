import { marca } from '@/config/marca'
import { nombreRol, type Rol } from '@/lib/permisos'

/** Texto para avisar por WhatsApp. Lleva a /registro con el correo: no incluye ningún enlace de acceso. */
export function textoInvitacion(empresa: string, rol: Rol, email: string, nombre?: string | null) {
  const url = `${window.location.origin}/registro?email=${encodeURIComponent(email)}`
  return (
    `Hola${nombre ? ` ${nombre}` : ''}. ${empresa} te invitó a ${marca.nombre} como ${nombreRol[rol]}. ` +
    `Crea tu cuenta con este correo (${email}) aquí: ${url}\n` +
    `Si ya tienes cuenta, solo entra con ese mismo correo.`
  )
}
