import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { fecha, moneda } from '@/lib/formato'

export interface DatosOrden {
  empresa: { nombre: string; color_marca: string; telefono: string | null }
  logo: string | null
  orden: {
    folio: number
    etapa: string
    descripcion: string
    cantidad: number
    fecha_compromiso: string | null
    costo_acordado: number
    pagado: number
    notas: string | null
    pedido_folio: number | null
  }
  destajista: string | null
}

const GRIS = '#6e6e73'
const LINEA = '#e5e5ea'
const TINTA = '#1d1d1f'

const s = StyleSheet.create({
  pagina: { paddingTop: 40, paddingBottom: 56, paddingHorizontal: 44, fontFamily: 'Helvetica', fontSize: 10.5, color: TINTA, lineHeight: 1.4 },
  barra: { position: 'absolute', top: 0, left: 0, right: 0, height: 5 },
  encabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 },
  logo: { maxWidth: 140, maxHeight: 48, objectFit: 'contain' },
  marcaTexto: { fontSize: 15, fontFamily: 'Helvetica-Bold' },
  titulo: { fontSize: 24, fontFamily: 'Helvetica-Bold', letterSpacing: -0.5, lineHeight: 1.2 },
  folio: { fontSize: 11, color: GRIS, marginTop: 4, lineHeight: 1.2 },
  etiqueta: { fontSize: 7.5, color: GRIS, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 },
  datos: { flexDirection: 'row', flexWrap: 'wrap', gap: 28, marginTop: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: LINEA },
  trabajo: { marginTop: 22, padding: 16, borderWidth: 1, borderColor: LINEA, borderRadius: 8 },
  descripcion: { fontSize: 14, fontFamily: 'Helvetica-Bold', lineHeight: 1.35 },
  cantidad: { fontSize: 28, fontFamily: 'Helvetica-Bold', marginTop: 2, marginBottom: 6, lineHeight: 1.15 },
  pago: { marginTop: 22, marginLeft: 'auto', width: 220 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5 },
  gris: { color: GRIS },
  fuerte: { fontFamily: 'Helvetica-Bold' },
  firmas: { flexDirection: 'row', gap: 40, marginTop: 70 },
  firma: { flex: 1, borderTopWidth: 1, borderTopColor: TINTA, paddingTop: 6, fontSize: 8.5, color: GRIS, textAlign: 'center' },
  pieIzq: { position: 'absolute', bottom: 24, left: 44, right: 200, fontSize: 7.5, color: GRIS },
  pieDer: { position: 'absolute', bottom: 24, right: 44, width: 150, textAlign: 'right', fontSize: 7.5, color: GRIS },
})

/** Orden para el destajista: qué hacer, cuántas piezas, para cuándo y cuánto se le paga. Sin datos del cliente. */
export function DocumentoOrden({ empresa, logo, orden: o, destajista }: DatosOrden) {
  const acento = /^#[0-9a-fA-F]{6}$/.test(empresa.color_marca) ? empresa.color_marca : TINTA
  return (
    <Document title={`Orden O-${o.folio} · ${empresa.nombre}`} author={empresa.nombre} language="es-MX">
      <Page size="LETTER" style={s.pagina}>
        <View style={[s.barra, { backgroundColor: acento }]} fixed />
        <View style={s.encabezado}>
          {logo ? <Image src={logo} style={s.logo} /> : <Text style={s.marcaTexto}>{empresa.nombre}</Text>}
          <Text style={[s.gris, { fontSize: 8.5 }]}>Orden de producción</Text>
        </View>

        <Text style={s.titulo}>{o.etapa}</Text>
        <Text style={s.folio}>
          O-{o.folio}
          {o.pedido_folio ? `  ·  Pedido P-${o.pedido_folio}` : ''}
        </Text>

        <View style={s.datos}>
          <View>
            <Text style={s.etiqueta}>Destajista</Text>
            <Text style={s.fuerte}>{destajista ?? 'Sin asignar'}</Text>
          </View>
          <View>
            <Text style={s.etiqueta}>Entregar a más tardar</Text>
            <Text style={s.fuerte}>{o.fecha_compromiso ? fecha(o.fecha_compromiso) : 'Por definir'}</Text>
          </View>
        </View>

        <View style={s.trabajo}>
          <Text style={s.etiqueta}>Trabajo</Text>
          <Text style={s.descripcion}>{o.descripcion}</Text>
          <Text style={[s.etiqueta, { marginTop: 14 }]}>Piezas</Text>
          <Text style={[s.cantidad, { color: acento }]}>{o.cantidad}</Text>
          {o.notas && (
            <>
              <Text style={[s.etiqueta, { marginTop: 14 }]}>Notas</Text>
              <Text>{o.notas}</Text>
            </>
          )}
        </View>

        <View style={s.pago} wrap={false}>
          <View style={s.fila}>
            <Text style={s.gris}>Pago acordado</Text>
            <Text style={s.fuerte}>{moneda(o.costo_acordado)}</Text>
          </View>
          {o.pagado > 0 && (
            <View style={s.fila}>
              <Text style={s.gris}>Adelantado</Text>
              <Text>{moneda(o.pagado)}</Text>
            </View>
          )}
        </View>

        <View style={s.firmas}>
          <Text style={s.firma}>Entrega {empresa.nombre}</Text>
          <Text style={s.firma}>Recibe {destajista ?? 'destajista'}</Text>
        </View>

        <Text style={s.pieIzq} fixed>
          {empresa.nombre}
        </Text>
        <Text style={s.pieDer} fixed>
          Orden O-{o.folio}
        </Text>
      </Page>
    </Document>
  )
}
