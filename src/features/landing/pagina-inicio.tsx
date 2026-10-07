import { ArrowRight, BadgeDollarSign, Boxes, Check, ClipboardCheck, FileText, Hammer, LayoutDashboard, Plus, Truck, Users, Wallet } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { marca } from '@/config/marca'
import { planes } from '@/config/planes'
import { moneda } from '@/lib/formato'

// Landing pública (borrador). Las capturas son de la app real, con la empresa de demostración
// "Muebles Alameda" (datos ficticios) en veta-dev. Sin cifras inventadas: los precios vienen de config.

const ANIO = new Date().getFullYear()
const REGISTRO = 'Prueba gratis' // un solo texto para la misma acción en toda la página

const FLUJO = [
  { icono: FileText, titulo: 'Cotiza', texto: 'Tu catálogo calcula el precio con la madera, la tela y el acabado. Mandas el PDF por WhatsApp.' },
  { icono: Wallet, titulo: 'Cobra el anticipo', texto: 'Al cubrir el anticipo, el pedido pasa solo a producción. Cada pago deja su recibo.' },
  { icono: Hammer, titulo: 'Produce', texto: 'Asignas carpintería, laca y tapicería a cada proveedor con su pago acordado.' },
  { icono: Truck, titulo: 'Entrega liquidado', texto: 'Nada sale del taller con saldo pendiente. Tu cliente sabe cuánto le falta.' },
]

const MAS = [
  { icono: BadgeDollarSign, titulo: 'Links de pago con Mercado Pago', texto: 'Para el anticipo o el saldo. El dinero llega a tu cuenta y el pago se registra solo.' },
  { icono: Boxes, titulo: 'Insumos con alertas', texto: 'Tela, piel, espuma y herrajes con existencia, costo promedio y aviso bajo el mínimo.' },
  { icono: LayoutDashboard, titulo: 'Tablero del mes', texto: 'Ventas, cobranza, lo que debes a proveedores y el margen de cada pedido.' },
  { icono: Users, titulo: 'Cada quien ve lo suyo', texto: 'El vendedor no ve costos; el proveedor solo ve sus órdenes y lo que se le debe.' },
]

const PREGUNTAS = [
  { p: '¿Necesito tarjeta para probar?', r: `No. Tienes ${planes.diasPrueba} días con todo incluido. Al terminar, la cuenta queda en solo lectura hasta que te suscribas; tus datos no se borran.` },
  { p: '¿Mis proveedores tienen que usar la app?', r: 'No es obligatorio. Puedes mandarles cada orden en PDF por WhatsApp. Si quieren, entran desde su celular para marcar "Empecé" y "Terminé" y ver lo que se les debe.' },
  { p: '¿Emite facturas (CFDI)?', r: 'Todavía no. Por ahora marcas el pedido como facturado y adjuntas el CFDI de tu sistema de facturación. La facturación integrada viene después.' },
  { p: '¿A qué cuenta llega el dinero de Mercado Pago?', r: 'A la tuya. Conectas tu propia cuenta de Mercado Pago; nosotros nunca tocamos tu dinero.' },
  { p: '¿Funciona en el celular?', r: 'Sí. Se usa desde el navegador y puedes instalarla en la pantalla de inicio. El portal del cliente y la vista del proveedor están pensados primero para celular.' },
  { p: '¿Quién ve mis costos y márgenes?', r: 'Solo el Admin y el Contador. El Vendedor ve precios pero no costos; el proveedor solo ve sus órdenes.' },
]

/** Captura real de la app en un marco sobrio. La imagen se ancla arriba dentro de una proporción fija. */
function Captura({ src, alt, ancho, alto, className, prioridad }: { src: string; alt: string; ancho: number; alto: number; className?: string; prioridad?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-2xl border bg-background shadow-[0_24px_60px_-28px_rgb(23_23_23/0.35)] ${className ?? ''}`}>
      <img
        src={src}
        alt={alt}
        width={ancho}
        height={alto}
        loading={prioridad ? 'eager' : 'lazy'}
        fetchPriority={prioridad ? 'high' : 'auto'}
        decoding="async"
        className="h-full w-full object-cover object-top"
      />
    </div>
  )
}

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
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <span className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <img src="/icon.svg" alt="" className="size-7" />
            {marca.nombre}
          </span>
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Principal">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <a href="#como-funciona">Cómo funciona</a>
            </Button>
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <a href="#precios">Precios</a>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/entrar">Entrar</Link>
            </Button>
            <Button asChild>
              <Link to="/registro">{REGISTRO}</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero: mensaje a la izquierda, producto real a la derecha */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-20 lg:grid-cols-[1fr_1.05fr] lg:gap-10 lg:pt-20 lg:pb-28">
          <div className="entrada grid justify-items-start gap-6">
            <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">{marca.lema}</h1>
            <p className="max-w-md text-lg text-pretty text-muted-foreground">
              Cotiza, cobra anticipos y manda a producir con tus proveedores. Tu cliente ve el avance desde su celular.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="h-12 px-6 text-base" asChild>
                <Link to="/registro">
                  {REGISTRO} <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-6 text-base" asChild>
                <a href="#como-funciona">Cómo funciona</a>
              </Button>
            </div>
          </div>

          <div className="entrada entrada-tarde relative pb-10 lg:pb-0">
            <Captura
              src="/landing/cotizador.jpg"
              alt="Cotización con una mesa de parota y seis sillas: precio por renglón, subtotal, IVA y total calculados solos"
              ancho={800}
              alto={1031}
              prioridad
              className="aspect-[4/3.6] lg:mr-16"
            />
            <Captura
              src="/landing/portal.jpg"
              alt="Portal del cliente en el celular: pedido en producción con el avance de cada etapa"
              ancho={750}
              alto={1624}
              prioridad
              className="absolute right-0 -bottom-2 aspect-[9/16] w-[34%] max-w-52 rounded-[1.75rem] border-[6px] border-foreground/90 lg:-bottom-10"
            />
          </div>
        </section>

        {/* Cómo funciona: el flujo completo, en una línea */}
        <section id="como-funciona" className="scroll-mt-20 border-y bg-muted/40" aria-labelledby="titulo-flujo">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
            <h2 id="titulo-flujo" className="aparece max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Todo el pedido en un solo lugar
            </h2>
            <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4 lg:gap-8">
              {FLUJO.map((f) => (
                <li key={f.titulo} className="aparece relative grid content-start gap-3">
                  <span className="hidden h-px bg-border lg:absolute lg:top-5 lg:right-0 lg:left-12 lg:block" aria-hidden />
                  <span className="flex size-10 items-center justify-center rounded-full border bg-background" aria-hidden>
                    <f.icono className="size-5" strokeWidth={1.75} />
                  </span>
                  <h3 className="text-lg font-semibold">{f.titulo}</h3>
                  <p className="text-sm text-pretty text-muted-foreground">{f.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Producción */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:py-24 lg:grid-cols-2" aria-labelledby="titulo-produccion">
          <div className="aparece grid content-start gap-5">
            <h2 id="titulo-produccion" className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Cada proveedor sabe qué hacer y cuánto le pagas
            </h2>
            <p className="max-w-[60ch] text-pretty text-muted-foreground">
              Cada etapa del mueble es una orden con su proveedor, su fecha y su pago acordado. Ellos marcan &ldquo;Empecé&rdquo; y &ldquo;Terminé&rdquo; desde el celular y tú ves el avance en
              un tablero.
            </p>
            <ul className="grid gap-2 text-sm">
              {['Adelantos sin rebasar lo acordado', 'Corte semanal de lo que debes a cada uno', 'Material entregado registrado en su orden'].map((t) => (
                <li key={t} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>
          <Captura
            src="/landing/produccion.jpg"
            alt="Tablero de producción: órdenes de laca pendientes y en proceso, con su proveedor, su pago y los días que faltan"
            ancho={800}
            alto={1031}
            className="aparece aspect-[4/3.4]"
          />
        </section>

        {/* Portal del cliente */}
        <section className="border-y bg-muted/40" aria-labelledby="titulo-portal">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:py-24 lg:grid-cols-[0.8fr_1fr]">
            <Captura
              src="/landing/portal.jpg"
              alt="Vista del cliente en el celular: estado del pedido, fechas y avance por mueble"
              ancho={750}
              alto={1624}
              className="aparece order-last mx-auto aspect-[9/16] w-full max-w-64 rounded-[2rem] border-[7px] border-foreground/90 lg:order-first"
            />
            <div className="aparece grid content-start gap-5">
              <h2 id="titulo-portal" className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Tu cliente ve su pedido sin llamarte
              </h2>
              <p className="max-w-[60ch] text-pretty text-muted-foreground">
                Le mandas un link por WhatsApp. Sin contraseña ve el avance de sus muebles, sus pagos y su saldo, con tu logo y tus colores. Y si tienes Mercado Pago, puede pagar
                desde ahí.
              </p>
            </div>
          </div>
        </section>

        {/* Más herramientas */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:py-24" aria-labelledby="titulo-mas">
          <h2 id="titulo-mas" className="aparece max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Y lo que le sigue al pedido
          </h2>
          <div className="mt-12 grid gap-x-16 gap-y-10 md:grid-cols-2">
            {MAS.map((m) => (
              <div key={m.titulo} className="aparece flex gap-4">
                <m.icono className="mt-1 size-5 shrink-0" strokeWidth={1.75} aria-hidden />
                <div className="grid gap-1">
                  <h3 className="font-semibold">{m.titulo}</h3>
                  <p className="text-sm text-pretty text-muted-foreground">{m.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Precios */}
        <section id="precios" className="scroll-mt-20 border-t" aria-labelledby="titulo-precios">
          <div className="mx-auto grid max-w-3xl gap-8 px-4 py-20 sm:py-24">
            <div className="text-center">
              <h2 id="titulo-precios" className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Precios
              </h2>
              <p className="mt-3 text-muted-foreground">
                Un precio por empresa, con todos tus usuarios. {planes.diasPrueba} días de prueba, sin tarjeta.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Precio plan={planes.mensual} />
              <Precio plan={planes.anual} />
            </div>
            <ul className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              {planes.incluye.map((t) => (
                <li key={t} className="flex gap-2">
                  <ClipboardCheck className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Preguntas frecuentes */}
        <section className="mx-auto max-w-3xl border-t px-4 py-20 sm:py-24" aria-labelledby="titulo-preguntas">
          <h2 id="titulo-preguntas" className="mb-8 text-3xl font-semibold tracking-tight">
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

        {/* Cierre */}
        <section className="border-t bg-muted/40">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-16">
            <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-balance">Tu próxima cotización, en minutos</h2>
            <Button size="lg" className="h-12 px-6 text-base" asChild>
              <Link to="/registro">
                {REGISTRO} <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer>
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
