import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { fecha, moneda, porcentaje } from '@/lib/formato'
import { telefonoLegible } from '@/lib/telefono'

export interface DatosPdf {
  empresa: {
    nombre: string
    razon_social: string | null
    rfc: string | null
    telefono: string | null
    email: string | null
    direccion: string | null
    color_marca: string
    iva: number
    condiciones_cotizacion: string | null
  }
  /** data: URL del logo en PNG/JPG, o null para mostrar el nombre. */
  logo: string | null
  cotizacion: {
    folio: number
    fecha: string
    vigencia_hasta: string | null
    subtotal: number
    descuento_pct: number
    descuento_monto: number
    envio: number
    iva: number
    total: number
    precios_con_iva: boolean
    notas: string | null
  }
  cliente: { nombre: string; empresa: string | null; telefono: string | null; email: string | null; direccion: string | null }
  renglones: { descripcion: string; opciones: string | null; cantidad: number; precio: number; importe: number }[]
}

const GRIS = '#6e6e73'
const LINEA = '#e5e5ea'
const TINTA = '#1d1d1f'

const s = StyleSheet.create({
  pagina: { paddingTop: 40, paddingBottom: 56, paddingHorizontal: 44, fontFamily: 'Helvetica', fontSize: 9.5, color: TINTA, lineHeight: 1.4 },
  barra: { position: 'absolute', top: 0, left: 0, right: 0, height: 5 },
  encabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  logo: { maxWidth: 150, maxHeight: 54, objectFit: 'contain' },
  marcaTexto: { fontSize: 16, fontFamily: 'Helvetica-Bold' },
  contacto: { textAlign: 'right', color: GRIS, fontSize: 8.5 },
  titulo: { fontSize: 24, fontFamily: 'Helvetica-Bold', letterSpacing: -0.5, lineHeight: 1.2 },
  folio: { fontSize: 11, color: GRIS, marginTop: 4, lineHeight: 1.2 },
  datos: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, marginBottom: 22, paddingTop: 14, borderTopWidth: 1, borderTopColor: LINEA },
  etiqueta: { fontSize: 7.5, color: GRIS, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 },
  fuerte: { fontFamily: 'Helvetica-Bold' },
  gris: { color: GRIS },
  tablaEnc: { flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: TINTA },
  fila: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: LINEA },
  cDesc: { flex: 1, paddingRight: 10 },
  cCant: { width: 40, textAlign: 'right' },
  cPrecio: { width: 82, textAlign: 'right' },
  cImporte: { width: 86, textAlign: 'right' },
  totales: { marginTop: 14, marginLeft: 'auto', width: 230 },
  filaTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5 },
  total: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: TINTA },
  totalTexto: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  bloque: { marginTop: 26 },
  pieIzq: { position: 'absolute', bottom: 24, left: 44, right: 200, fontSize: 7.5, color: GRIS },
  pieDer: { position: 'absolute', bottom: 24, right: 44, width: 150, textAlign: 'right', fontSize: 7.5, color: GRIS },
})

function colorValido(c: string) {
  return /^#[0-9a-fA-F]{6}$/.test(c) ? c : TINTA
}

export function DocumentoCotizacion({ empresa, logo, cotizacion: c, cliente, renglones }: DatosPdf) {
  const acento = colorValido(empresa.color_marca)
  const contacto = [empresa.telefono && telefonoLegible(empresa.telefono), empresa.email].filter(Boolean)

  return (
    <Document title={`Cotización C-${c.folio} · ${empresa.nombre}`} author={empresa.nombre} language="es-MX">
      <Page size="LETTER" style={s.pagina}>
        <View style={[s.barra, { backgroundColor: acento }]} fixed />

        <View style={s.encabezado}>
          {logo ? <Image src={logo} style={s.logo} /> : <Text style={s.marcaTexto}>{empresa.nombre}</Text>}
          <View style={s.contacto}>
            {logo && <Text style={[s.fuerte, { color: TINTA }]}>{empresa.nombre}</Text>}
            {empresa.direccion && <Text>{empresa.direccion}</Text>}
            {contacto.length > 0 && <Text>{contacto.join('  ·  ')}</Text>}
          </View>
        </View>

        <Text style={s.titulo}>Cotización</Text>
        <Text style={s.folio}>C-{c.folio}</Text>

        <View style={s.datos}>
          <View style={{ width: '55%' }}>
            <Text style={s.etiqueta}>Para</Text>
            <Text style={s.fuerte}>{cliente.nombre}</Text>
            {cliente.empresa && <Text>{cliente.empresa}</Text>}
            {cliente.telefono && <Text style={s.gris}>{telefonoLegible(cliente.telefono)}</Text>}
            {cliente.email && <Text style={s.gris}>{cliente.email}</Text>}
          </View>
          <View style={{ flexDirection: 'row', gap: 24 }}>
            <View>
              <Text style={s.etiqueta}>Fecha</Text>
              <Text>{fecha(c.fecha)}</Text>
            </View>
            <View>
              <Text style={s.etiqueta}>Válida hasta</Text>
              <Text>{fecha(c.vigencia_hasta)}</Text>
            </View>
          </View>
        </View>

        <View style={s.tablaEnc} fixed>
          <Text style={[s.cDesc, s.etiqueta, { marginBottom: 0 }]}>Descripción</Text>
          <Text style={[s.cCant, s.etiqueta, { marginBottom: 0 }]}>Cant.</Text>
          <Text style={[s.cPrecio, s.etiqueta, { marginBottom: 0 }]}>Precio</Text>
          <Text style={[s.cImporte, s.etiqueta, { marginBottom: 0 }]}>Importe</Text>
        </View>
        {renglones.map((r, i) => (
          <View key={i} style={s.fila} wrap={false}>
            <View style={s.cDesc}>
              <Text style={s.fuerte}>{r.descripcion}</Text>
              {r.opciones && <Text style={s.gris}>{r.opciones}</Text>}
            </View>
            <Text style={s.cCant}>{r.cantidad}</Text>
            <Text style={s.cPrecio}>{moneda(r.precio)}</Text>
            <Text style={s.cImporte}>{moneda(r.importe)}</Text>
          </View>
        ))}

        <View style={s.totales} wrap={false}>
          <View style={s.filaTotal}>
            <Text style={s.gris}>Subtotal</Text>
            <Text>{moneda(c.subtotal)}</Text>
          </View>
          {c.descuento_pct > 0 && (
            <View style={s.filaTotal}>
              <Text style={s.gris}>Descuento {porcentaje(c.descuento_pct / 100)}</Text>
              <Text>-{moneda(c.descuento_monto)}</Text>
            </View>
          )}
          {c.envio > 0 && (
            <View style={s.filaTotal}>
              <Text style={s.gris}>Envío</Text>
              <Text>{moneda(c.envio)}</Text>
            </View>
          )}
          <View style={s.filaTotal}>
            <Text style={s.gris}>{c.precios_con_iva ? `IVA incluido (${porcentaje(empresa.iva)})` : `IVA ${porcentaje(empresa.iva)}`}</Text>
            <Text>{moneda(c.iva)}</Text>
          </View>
          <View style={s.total}>
            <Text style={s.totalTexto}>Total</Text>
            <Text style={[s.totalTexto, { color: acento }]}>{moneda(c.total)}</Text>
          </View>
          {c.precios_con_iva && <Text style={[s.gris, { fontSize: 8, textAlign: 'right', marginTop: 2 }]}>Precios con IVA incluido</Text>}
        </View>

        {c.notas && (
          <View style={s.bloque} wrap={false}>
            <Text style={s.etiqueta}>Notas</Text>
            <Text>{c.notas}</Text>
          </View>
        )}
        {empresa.condiciones_cotizacion && (
          <View style={s.bloque}>
            <Text style={s.etiqueta}>Condiciones</Text>
            <Text style={s.gris}>{empresa.condiciones_cotizacion}</Text>
          </View>
        )}

        <Text style={s.pieIzq} fixed>
          {[empresa.razon_social, empresa.rfc && `RFC ${empresa.rfc}`].filter(Boolean).join('  ·  ') || empresa.nombre}
        </Text>
        {/* Texto fijo: en react-pdf 4.9 con React 19, <Text render> (número de página) no se dibuja. */}
        <Text style={s.pieDer} fixed>
          Cotización C-{c.folio}
        </Text>
      </Page>
    </Document>
  )
}
