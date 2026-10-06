// Color de marca de cada mueblería (empresas.color_marca) usado en el portal.
// El texto sobre el acento se elige por contraste (WCAG), no a ojo.

const HEX = /^#([0-9a-f]{6})$/i

function luminancia(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const canal = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255)
}

export function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

/** Color válido (#rrggbb) o el gris oscuro predeterminado. */
export function colorMarca(color: string | null | undefined): string {
  return color && HEX.test(color) ? color : '#1d1d1f'
}

/** Texto legible sobre el acento: blanco o casi negro, el que dé más contraste. */
export function textoSobre(fondo: string): string {
  return contraste(fondo, '#ffffff') >= contraste(fondo, '#1d1d1f') ? '#ffffff' : '#1d1d1f'
}

