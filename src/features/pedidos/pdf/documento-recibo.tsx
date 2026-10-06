import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { fecha, moneda } from '@/lib/formato'
import { telefonoLegible } from '@/lib/telefono'

export interface DatosRecibo {
  empresa: {
    nombre: string
    razon_social: string | null
    rfc: string | null
    telefono: string | null
    email: string | null
    direccion: string | null
    color_marca: string
  }
  logo: string | null
  pago: { folio: number; fecha: string; monto: number; metodo: string; referencia: string | null; anulado: boolean }
  pedido: { folio: number; total: number; pagado_acumulado: number; saldo_despues: number }
  cliente: { nombre: string; empresa: string | null }
}

const GRIS = '#6e6e73'
const LINEA = '#e5e5ea'
const TINTA = '#1d1d1f'

const s = StyleSheet.create({
  pagina: { paddingTop: 40, paddingBottom: 56, paddingHorizontal: 44, fontFamily: 'Helvetica', fontSize: 10, color: TINTA, lineHeight: 1.4 },
  barra: { position: 'absolute', top: 0, left: 0, right: 0, height: 5 },
  encabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  logo: { maxWidth: 150, maxHeight: 54, objectFit: 'contain' },
  marcaTexto: { fontSize: 16, fontFamily: 'Helvetica-Bold' },
  contacto: { textAlign: 'right', color: GRIS, fontSize: 8.5 },
  titulo: { fontSize: 24, fontFamily: 'Helvetica-Bold', letterSpacing: -0.5, lineHeight: 1.2 },
  folio: { fontSize: 11, color: GRIS, marginTop: 4, lineHeight: 1.2 },
  etiqueta: { fontSize: 7.5, color: GRIS, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 },
  bloque: { marginTop: 22, paddingTop: 14, borderTopWidth: 1, borderTopColor: LINEA, flexDirection: 'row', justifyContent: 'space-between' },
  monto: { fontSize: 32, fontFamily: 'Helvetica-Bold', letterSpacing: -0.8, marginTop: 4 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  resumen: { marginTop: 26, marginLeft: 'auto', width: 240 },
  gris: { color: GRIS },
  fuerte: { fontFamily: 'Helvetica-Bold' },
  sello: { marginTop: 18, padding: 8, borderWidth: 1, borderColor: '#d70015', color: '#d70015', fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  pieIzq: { position: 'absolute', bottom: 24, left: 44, right: 200, fontSize: 7.5, color: GRIS },
  pieDer: { position: 'absolute', bottom: 24, right: 44, width: 150, textAlign: 'right', fontSize: 7.5, color: GRIS },
})

export function DocumentoRecibo({ empresa, logo, pago, pedido, cliente }: DatosRecibo) {
  const acento = /^#[0-9a-fA-F]{6}$/.test(empresa.color_marca) ? empresa.color_marca : TINTA
  const contacto = [empresa.telefono && telefonoLegible(empresa.telefono), empresa.email].filter(Boolean)
  const aFavor = pedido.saldo_despues < 0

  return (
    <Document title={`Recibo R-${pago.folio} · ${empresa.nombre}`} author={empresa.nombre} language="es-MX">
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

        <Text style={s.titulo}>Recibo de pago</Text>
        <Text style={s.folio}>R-{pago.folio}</Text>

        <View style={s.bloque}>
          <View>
            <Text style={s.etiqueta}>Recibimos de</Text>
            <Text style={s.fuerte}>{cliente.nombre}</Text>
            {cliente.empresa && <Text>{cliente.empresa}</Text>}
          </View>
          <View style={{ flexDirection: 'row', gap: 24 }}>
            <View>
              <Text style={s.etiqueta}>Fecha</Text>
              <Text>{fecha(pago.fecha)}</Text>
            </View>
            <View>
              <Text style={s.etiqueta}>Pedido</Text>
              <Text>P-{pedido.folio}</Text>
            </View>
          </View>
        </View>

        <View style={s.bloque}>
          <View>
            <Text style={s.etiqueta}>Cantidad recibida</Text>
            <Text style={[s.monto, { color: acento }]}>{moneda(pago.monto)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.etiqueta}>Forma de pago</Text>
            <Text>{pago.metodo}</Text>
            {pago.referencia && <Text style={s.gris}>Ref. {pago.referencia}</Text>}
          </View>
        </View>

        {pago.anulado && <Text style={s.sello}>PAGO ANULADO</Text>}

        <View style={s.resumen}>
          <View style={s.fila}>
            <Text style={s.gris}>Total del pedido</Text>
            <Text>{moneda(pedido.total)}</Text>
          </View>
          <View style={s.fila}>
            <Text style={s.gris}>Pagado a la fecha</Text>
            <Text>{moneda(pedido.pagado_acumulado)}</Text>
          </View>
          <View style={[s.fila, { borderTopWidth: 1, borderTopColor: TINTA, marginTop: 4, paddingTop: 6 }]}>
            <Text style={s.fuerte}>{aFavor ? 'Saldo a favor' : 'Saldo pendiente'}</Text>
            <Text style={s.fuerte}>{moneda(Math.abs(pedido.saldo_despues))}</Text>
          </View>
        </View>

        <Text style={s.pieIzq} fixed>
          {[empresa.razon_social, empresa.rfc && `RFC ${empresa.rfc}`].filter(Boolean).join('  ·  ') || empresa.nombre}
        </Text>
        <Text style={s.pieDer} fixed>
          Recibo R-{pago.folio}
        </Text>
      </Page>
    </Document>
  )
}
