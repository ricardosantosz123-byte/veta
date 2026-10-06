import { Boxes, Check, ClipboardList, CreditCard, Factory, FileText, PackageSearch, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { marca } from '@/config/marca'
import { planes } from '@/config/planes'
import { moneda } from '@/lib/formato'

// BORRADOR de la landing pública (Fase 10). Textos por revisar; sin capturas ni cifras inventadas.

const ANIO = new Date().getFullYear()

const FUNCIONES = [
  { icono: FileText, titulo: 'Cotiza en minutos', texto: 'Tu catálogo con opciones (madera, tela, acabado) calcula el precio solo. PDF con tu logo, listo para WhatsApp o correo.' },
  { icono: CreditCard, titulo: 'Anticipos y saldos al día', texto: 'Cada pedido lleva su anticipo, sus pagos y su saldo. Nada sale del taller sin estar liquidado.' },
  { icono: Factory, titulo: 'Producción por destajista', texto: 'Asigna carpintería, laca y tapicería a cada destajista, con su pago acordado. Sabes qué le debes a cada quien.' },
  { icono: PackageSearch, titulo: 'Tu cliente sigue su pedido', texto: 'Un link sin contraseña muestra el avance de sus muebles, sus pagos y el saldo, con tu logo.' },
  { icono: ClipboardList, titulo: 'Cobra con Mercado Pago', texto: 'Genera un link de pago para el anticipo o el saldo. El dinero llega a tu cuenta y el pago se registra solo.' },
  { icono: Boxes, titulo: 'Insumos bajo control', texto: 'Tela, piel, espuma y herrajes con existencia, costo promedio y aviso cuando bajan del mínimo.' },
]

const PREGUNTAS = [
  { p: '¿Necesito tarjeta para probar?', r: `No. Tienes ${planes.diasPrueba} días con todo incluido. Al terminar, la cuenta queda en solo lectura hasta que te suscribas; tus datos no se borran.` },
  { p: '¿Mis destajistas tienen que usar la app?', r: 'No es obligatorio. Puedes mandarles cada orden en PDF por WhatsApp. Si quieren, entran desde su celular para marcar "Empecé" y "Terminé" y ver lo que se les debe.' },
  { p: '¿Emite facturas (CFDI)?', r: 'Todavía no. Por ahora marcas el pedido como facturado y adjuntas el CFDI de tu sistema de facturación. La facturación integrada viene después.' },
  { p: '¿A qué cuenta llega el dinero de Mercado Pago?', r: 'A la tuya. Conectas tu propia cuenta de Mercado Pago; nosotros nunca tocamos tu dinero.' },
  { p: '¿Funciona en el celular?', r: 'Sí. Se usa desde el navegador y puedes instalarla en la pantalla de inicio. El portal del cliente y la vista del destajista están pensados primero para celular.' },
  { p: '¿Quién ve mis costos y márgenes?', r: 'Solo el Admin y el Contador. El Vendedor ve precios pero no costos; el destajista solo ve sus órdenes.' },
]

function Precio({ plan }: { plan: { nombre: string; precio: number | null; periodo: string } }) {
  return (
    <div className="grid gap-1 rounded-2xl border bg-card p-6">
      <p className="text-sm font-medium text-muted-foreground">{plan.nombre}</p>
      {plan.precio === null ? (
        <p className="text-2xl font-semibold tracking-tight">Precio por anunciar</p>
      ) : (
        <p className="text-3xl font-semibold tracking-tight tabular">
          {moneda(plan.precio)} <span className="text-base font-normal text-muted-foreground">{plan.periodo}</span>
        </p>
      )}
    </div>
  )
}

export default function PaginaInicio() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <span className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <img src="/icon.svg" alt="" className="size-7" />
          {marca.nombre}
        </span>
        <nav className="flex items-center gap-2" aria-label="Cuenta">
          <Button variant="ghost" asChild>
            <Link to="/entrar">Entrar</Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link to="/registro">Prueba {planes.diasPrueba} días</Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-3xl justify-items-center gap-6 px-4 pt-16 pb-24 text-center sm:pt-28">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">{marca.lema}</h1>
          <p className="max-w-xl text-lg text-pretty text-muted-foreground">
            Para mueblerías y talleres de carpintería, laca y tapicería: cotiza, cobra anticipos, manda a producir con tus destajistas y deja que tu cliente vea el avance, desde la
            computadora o el celular.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" className="h-12 px-6 text-base" asChild>
              <Link to="/registro">Prueba {planes.diasPrueba} días sin tarjeta</Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-6 text-base" asChild>
              <a href="#funciones">Ver cómo funciona</a>
            </Button>
          </div>
        </section>

        <section id="funciones" className="mx-auto max-w-6xl scroll-mt-8 border-t px-4 py-20 sm:py-24" aria-labelledby="titulo-funciones">
          <h2 id="titulo-funciones" className="mb-12 max-w-xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Todo lo que tu taller necesita, en un solo lugar
          </h2>
          <ul className="grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {FUNCIONES.map((f) => (
              <li key={f.titulo} className="grid content-start gap-2">
                <f.icono className="mb-1 size-5" strokeWidth={1.75} aria-hidden />
                <h3 className="font-semibold">{f.titulo}</h3>
                <p className="text-sm text-pretty text-muted-foreground">{f.texto}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-y bg-muted/40" aria-labelledby="titulo-quien">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-20 sm:py-24 md:grid-cols-2">
            <div className="grid content-start gap-3">
              <h2 id="titulo-quien" className="text-2xl font-semibold tracking-tight">
                Hecho para cómo trabajas
              </h2>
              <p className="text-muted-foreground">Si vendes y mandas a maquilar, o si fabricas en tu propio taller, el flujo es el mismo: cotización, pedido con anticipo, órdenes por etapa y entrega liquidada.</p>
            </div>
            <ul className="grid gap-3 text-sm">
              {['Costeo por etapa con markup, o precio base más ajustes por opción', 'Listas de precios: público, expo o mayoreo, con o sin IVA', 'Venta por partes: el cliente aprueba unos muebles y otros después', 'Corte semanal para pagar a tus destajistas'].map((t) => (
                <li key={t} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto grid max-w-3xl gap-8 px-4 py-20 sm:py-24" aria-labelledby="titulo-precios">
          <div className="text-center">
            <h2 id="titulo-precios" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Precios
            </h2>
            <p className="mt-2 text-muted-foreground">Un precio por empresa, con todos tus usuarios incluidos.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Precio plan={planes.mensual} />
            <Precio plan={planes.anual} />
          </div>
          <ul className="grid gap-2 text-sm">
            {planes.incluye.map((t) => (
              <li key={t} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0" aria-hidden /> {t}
              </li>
            ))}
          </ul>
          <Button size="lg" className="h-12 justify-self-center px-6 text-base" asChild>
            <Link to="/registro">Prueba {planes.diasPrueba} días sin tarjeta</Link>
          </Button>
        </section>

        <section className="mx-auto max-w-3xl border-t px-4 py-20 sm:py-24" aria-labelledby="titulo-preguntas">
          <h2 id="titulo-preguntas" className="mb-6 text-2xl font-semibold tracking-tight">
            Preguntas frecuentes
          </h2>
          <div className="divide-y rounded-2xl border">
            {PREGUNTAS.map((q) => (
              <details key={q.p} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-medium outline-none focus-visible:underline">
                  {q.p}
                  <Plus className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45 motion-reduce:transition-none" aria-hidden />
                </summary>
                <p className="pt-2 text-sm text-muted-foreground">{q.r}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-3xl justify-items-center gap-6 border-t px-4 py-20 text-center sm:py-24">
          <h2 className="text-2xl font-semibold tracking-tight">Empieza hoy, sin tarjeta</h2>
          <Button size="lg" className="h-12 px-6 text-base" asChild>
            <Link to="/registro">Crear mi cuenta</Link>
          </Button>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-muted-foreground">
          <span>
            © {ANIO} {marca.nombre}
          </span>
          <nav className="flex gap-4" aria-label="Legal">
            <Link to="/privacidad" className="hover:text-foreground">
              Aviso de privacidad
            </Link>
            <Link to="/terminos" className="hover:text-foreground">
              Términos
            </Link>
            <a href={`mailto:${marca.correoSoporte}`} className="hover:text-foreground">
              Soporte
            </a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
