import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { fecha, moneda } from '@/lib/formato'

export interface DatosCorte {
  empresa: { nombre: string; color_marca: string }
  desde: string
  hasta: string
  filas: { nombre: string; terminado: number; ordenes: number; pagado: number; por_pagar: number; comprometido: number }[]
}

const GRIS = '#6e6e73'
const LINEA = '#e5e5ea'
const TINTA = '#1d1d1f'

const s = StyleSheet.create({
  pagina: { paddingTop: 40, paddingBottom: 56, paddingHorizontal: 40, fontFamily: 'Helvetica', fontSize: 9.5, color: TINTA, lineHeight: 1.4 },
  barra: { position: 'absolute', top: 0, left: 0, right: 0, height: 5 },
  marca: { fontSize: 9, color: GRIS, marginBottom: 6 },
  titulo: { fontSize: 22, fontFamily: 'Helvetica-Bold', letterSpacing: -0.4, lineHeight: 1.2 },
  periodo: { fontSize: 11, color: GRIS, marginTop: 4, marginBottom: 22, lineHeight: 1.2 },
  enc: { flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: TINTA },
  fila: { flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: LINEA },
  etiqueta: { fontSize: 7.5, color: GRIS, textTransform: 'uppercase', letterSpacing: 0.5 },
  cNombre: { flex: 1 },
  cNum: { width: 82, textAlign: 'right' },
  fuerte: { fontFamily: 'Helvetica-Bold' },
  nota: { marginTop: 18, fontSize: 8, color: GRIS },
  pieIzq: { position: 'absolute', bottom: 24, left: 40, right: 200, fontSize: 7.5, color: GRIS },
  pieDer: { position: 'absolute', bottom: 24, right: 40, width: 160, textAlign: 'right', fontSize: 7.5, color: GRIS },
})

export function DocumentoCorte({ empresa, desde, hasta, filas }: DatosCorte) {
  const acento = /^#[0-9a-fA-F]{6}$/.test(empresa.color_marca) ? empresa.color_marca : TINTA
  return (
    <Document title={`Corte de destajo ${desde} a ${hasta} · ${empresa.nombre}`} author={empresa.nombre} language="es-MX">
      <Page size="LETTER" orientation="landscape" style={s.pagina}>
        <View style={[s.barra, { backgroundColor: acento }]} fixed />
        <Text style={s.marca}>{empresa.nombre}</Text>
        <Text style={s.titulo}>Corte de destajo</Text>
        <Text style={s.periodo}>
          Del {fecha(desde)} al {fecha(hasta)}
        </Text>

        <View style={s.enc} fixed>
          <Text style={[s.cNombre, s.etiqueta]}>Destajista</Text>
          <Text style={[s.cNum, s.etiqueta]}>Órdenes term.</Text>
          <Text style={[s.cNum, s.etiqueta]}>Terminado</Text>
          <Text style={[s.cNum, s.etiqueta]}>Pagado</Text>
          <Text style={[s.cNum, s.etiqueta]}>Por pagar</Text>
          <Text style={[s.cNum, s.etiqueta]}>Comprometido</Text>
        </View>
        {filas.map((f, i) => (
          <View key={i} style={s.fila} wrap={false}>
            <Text style={[s.cNombre, s.fuerte]}>{f.nombre}</Text>
            <Text style={s.cNum}>{f.ordenes}</Text>
            <Text style={s.cNum}>{moneda(f.terminado)}</Text>
            <Text style={s.cNum}>{moneda(f.pagado)}</Text>
            <Text style={[s.cNum, s.fuerte, { color: f.por_pagar > 0 ? acento : TINTA }]}>{moneda(f.por_pagar)}</Text>
            <Text style={s.cNum}>{moneda(f.comprometido)}</Text>
          </View>
        ))}

        <Text style={s.nota}>
          Terminado y Pagado: movimientos del periodo. Por pagar: órdenes terminadas menos lo pagado (al día de hoy). Comprometido: órdenes pendientes o en
          proceso menos los adelantos.
        </Text>
        <Text style={s.pieIzq} fixed>
          {empresa.nombre}
        </Text>
        <Text style={s.pieDer} fixed>
          Corte {desde} a {hasta}
        </Text>
      </Page>
    </Document>
  )
}
