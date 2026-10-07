import {
  ArrowRight,
  BadgeDollarSign,
  Boxes,
  Check,
  ClipboardCheck,
  FileText,
  Hammer,
  LayoutDashboard,
  Package,
  Pause,
  Play,
  Plus,
  Truck,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { marca } from '@/config/marca'
import { planes, type Plan } from '@/config/planes'
import { monedaEntera } from '@/lib/formato'
import { cn } from '@/lib/utils'

// Landing pública. Tono "del dolor a la solución" para mueblerías, talleres y despachos (Ricardo, 2026-10-06).
// Las capturas son de la app real con la empresa de demostración "Muebles Alameda" (datos ficticios)
// en veta-dev. Sin cifras inventadas: los precios vienen de src/config/planes.ts.

const ANIO = new Date().getFullYear()
const REGISTRO = `Prueba ${planes.diasPrueba} días gratis` // un solo texto para la misma acción en toda la página

const ANTES_DESPUES = [
  { antes: 'Calculas cada precio con la calculadora y una lista vieja.', despues: 'El catálogo calcula el precio con la madera, la tela y el acabado.' },
  { antes: 'Los anticipos viven en una libreta.', despues: 'Cada pago deja su recibo y el saldo se actualiza solo.' },
  { antes: 'Preguntas por WhatsApp a cada proveedor cómo va.', despues: 'Cada proveedor marca su avance desde el celular.' },
  { antes: 'Tu cliente te llama para saber de su mueble.', despues: 'Tu cliente ve su pedido con un link, sin llamarte.' },
  { antes: 'No sabes cuánto le debes a cada proveedor.', despues: 'Un corte semanal te dice qué pagar y a quién.' },
  { antes: 'La tela se acaba a media producción.', despues: 'Los insumos te avisan cuando bajan del mínimo.' },
]

const FLUJO = [
  { icono: FileText, titulo: 'Cotiza', texto: 'Tu catálogo calcula el precio con la madera, la tela y el acabado. Mandas el PDF por WhatsApp.' },
  { icono: Wallet, titulo: 'Cobra el anticipo', texto: 'Al cubrir el anticipo, el pedido pasa solo a producción. Cada pago deja su recibo.' },
  { icono: Hammer, titulo: 'Produce', texto: 'Asignas carpintería, laca y tapicería a cada proveedor con su pago acordado.' },
  { icono: Truck, titulo: 'Entrega liquidado', texto: 'Nada sale del taller con saldo pendiente. Tu cliente sabe cuánto le falta.' },
]

const ESCENAS = [
  {
    paso: 'Cotiza',
    texto: 'El precio de cada mueble sale de tu catálogo, con IVA y total.',
    src: '/landing/cotizador.jpg',
    ancho: 800,
    alto: 1031,
    alt: 'Cotización con una mesa de parota y seis sillas: precio por renglón, subtotal, IVA y total calculados solos',
    celular: false,
  },
  {
    paso: 'Produce',
    texto: 'Cada etapa con su proveedor, su fecha y su pago.',
    src: '/landing/produccion.jpg',
    ancho: 800,
    alto: 1031,
    alt: 'Tablero de producción: órdenes de laca pendientes y en proceso, con su proveedor, su pago y los días que faltan',
    celular: false,
  },
  {
    paso: 'Tu cliente lo ve',
    texto: 'Un link con el avance, sus pagos y su saldo.',
    src: '/landing/portal.jpg',
    ancho: 750,
    alto: 1624,
    alt: 'Portal del cliente en el celular: pedido en producción con el avance de cada etapa',
    celular: true,
  },
]
const DURACION_ESCENA = 4500

const PASOS_INICIO = [
  { icono: UserPlus, titulo: 'Crea tu cuenta', texto: `${planes.diasPrueba} días con todo incluido, sin tarjeta. Pones tu logo y tu color.` },
  { icono: Package, titulo: 'Da de alta tu catálogo', texto: 'Tus modelos con sus opciones y lo que cuesta cada etapa. El asistente te guía paso a paso.' },
  { icono: Users, titulo: 'Invita a tu equipo', texto: 'Vendedores, comprador y tus proveedores. Y manda tu primera cotización ese mismo día.' },
]

const MAS = [
  { icono: BadgeDollarSign, titulo: 'Links de pago con Mercado Pago', texto: 'Para el anticipo o el saldo. El dinero llega a tu cuenta y el pago se registra solo.' },
  { icono: Boxes, titulo: 'Insumos con alertas', texto: 'Tela, piel, espuma y herrajes con existencia, costo promedio y aviso bajo el mínimo.' },
  { icono: LayoutDashboard, titulo: 'Tablero del mes', texto: 'Ventas, cobranza, lo que debes a proveedores y el margen de cada pedido.' },
  { icono: Users, titulo: 'Cada quien ve lo suyo', texto: 'El vendedor no ve costos; el proveedor solo ve sus órdenes y lo que se le debe.' },
]

const PREGUNTAS = [
  { p: '¿Necesito tarjeta para probar?', r: `No. Tienes ${planes.diasPrueba} días con todo incluido. Al terminar, la cuenta queda en solo lectura hasta que te suscribas; tus datos no se borran.` },
  {
    p: '¿Cuántos usuarios incluye?',
    r: `Cada plan incluye ${planes.incluidos.oficina} usuarios de oficina (Vendedor, Comprador o Producción) y ${planes.incluidos.proveedores} proveedores con acceso. El Admin y el Contador no cuentan. Si necesitas más, cada usuario adicional cuesta ${monedaEntera(planes.extra.mensual)} al mes.`,
  },
  { p: '¿Puedo cancelar cuando quiera?', r: 'Sí, desde Suscripción, sin llamadas. Tu cuenta sigue funcionando hasta el final del periodo que ya pagaste.' },
  { p: '¿Funciona en el celular?', r: 'Sí. Se usa desde el navegador y puedes instalarla en la pantalla de inicio. El portal del cliente y la vista del proveedor están pensados primero para celular.' },
  { p: '¿Mis proveedores tienen que usar la app?', r: 'No es obligatorio. Puedes mandarles cada orden en PDF por WhatsApp. Si quieren, entran desde su celular para marcar "Empecé" y "Terminé" y ver lo que se les debe.' },
  { p: '¿Quién ve mis costos y márgenes?', r: 'Solo el Admin, el Comprador y el Contador. El Vendedor ve precios pero no costos; el proveedor solo ve sus órdenes.' },
  {
    p: '¿Mis datos están seguros?',
    r: 'Cada empresa ve solo sus datos, y cada usuario solo lo que su rol permite. Pagas con tarjeta a través de Stripe: nunca vemos ni guardamos los datos de tu tarjeta.',
  },
  { p: '¿A qué cuenta llega el dinero de Mercado Pago?', r: 'A la tuya. Conectas tu propia cuenta de Mercado Pago; nosotros nunca tocamos tu dinero.' },
  { p: '¿Emite facturas (CFDI)?', r: 'Todavía no. Por ahora marcas el pedido como facturado y adjuntas el CFDI de tu sistema de facturación. La facturación integrada viene después.' },
  {
    p: 'Soy despacho de interiores, ¿me sirve?',
    r: 'Sí: hoy puedes usarlo igual que una mueblería. El plan Despacho de Interiores, con proyectos que agrupan varios pedidos, viene en camino.',
  },
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

/**
 * Recorrido corto con capturas reales (el "video"): avanza solo cada 4.5 s mientras está a la vista,
 * se puede pausar y elegir cada paso. Con "reducir movimiento" no avanza solo ni hay escalas.
 */
function Recorrido() {
  const [activa, setActiva] = useState(0)
  const [pausado, setPausado] = useState(false)
  const [visible, setVisible] = useState(false)
  const [reducido] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.4 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const corriendo = visible && !pausado && !reducido
  useEffect(() => {
    if (!corriendo) return
    const t = setTimeout(() => setActiva((i) => (i + 1) % ESCENAS.length), DURACION_ESCENA)
    return () => clearTimeout(t)
  }, [corriendo, activa])

  return (
    <div ref={ref} className="grid gap-5">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border bg-muted/40 shadow-[0_24px_60px_-28px_rgb(23_23_23/0.35)]" aria-live="polite">
        {ESCENAS.map((e, i) => (
          <div
            key={e.src}
            aria-hidden={i !== activa}
            className={cn(
              'absolute inset-0 transition-[opacity,scale,filter] duration-500 ease-out',
              i === activa ? 'scale-100 opacity-100 blur-0' : 'pointer-events-none scale-[1.02] opacity-0 blur-[2px]',
              e.celular && 'flex items-center justify-center p-6',
            )}
          >
            <img
              src={e.src}
              alt={e.alt}
              width={e.ancho}
              height={e.alto}
              loading="lazy"
              decoding="async"
              className={cn(
                'object-cover object-top',
                e.celular ? 'aspect-[9/16] h-full w-auto rounded-[1.5rem] border-[6px] border-foreground/90 bg-background' : 'h-full w-full',
              )}
            />
          </div>
        ))}
        {!reducido && (
          <Button
            variant="outline"
            size="icon-lg"
            className="absolute right-3 bottom-3 rounded-full bg-background/90 shadow-sm dark:bg-background/90 dark:hover:bg-muted"
            onClick={() => setPausado((p) => !p)}
            aria-label={pausado ? 'Reanudar recorrido' : 'Pausar recorrido'}
          >
            {pausado ? <Play aria-hidden /> : <Pause aria-hidden />}
          </Button>
        )}
      </div>
      <ol className="grid gap-2 sm:grid-cols-3">
        {ESCENAS.map((e, i) => (
          <li key={e.paso}>
            <button
              type="button"
              onClick={() => setActiva(i)}
              aria-current={i === activa ? 'step' : undefined}
              className={cn(
                'grid min-h-11 w-full gap-1 rounded-xl px-3 pt-3 pb-2 text-left transition-colors duration-150 ease-out outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                i === activa ? 'bg-muted' : 'text-muted-foreground hover:bg-muted/60',
              )}
            >
              <span className="text-sm font-semibold text-foreground">
                {i + 1}. {e.paso}
              </span>
              <span className="text-sm text-pretty">{e.texto}</span>
              <span className="mt-1 h-0.5 overflow-hidden rounded-full bg-border" aria-hidden>
                {i === activa && (
                  <span
                    key={`${activa}-${corriendo}`}
                    className={cn('block h-full origin-left bg-foreground', corriendo ? 'avance-escena' : 'scale-x-100')}
                    style={{ animationDuration: `${DURACION_ESCENA}ms` }}
                  />
                )}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Precio({ plan }: { plan: Plan }) {
  return (
    <div className={cn('grid content-start gap-3 rounded-2xl border bg-card p-6', !plan.disponible && 'bg-muted/40')}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{plan.nombre}</h3>
        {!plan.disponible && <span className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">Próximamente</span>}
      </div>
      <p className="text-sm text-muted-foreground">{plan.para}</p>
      <p className="text-4xl font-semibold tracking-tight tabular">
        {monedaEntera(plan.mensual)} <span className="text-base font-normal text-muted-foreground">al mes</span>
      </p>
      <p className="text-sm text-muted-foreground">
        o <span className="tabular">{monedaEntera(plan.anual)}</span> al año: 2 meses gratis
      </p>
    </div>
  )
}

export default function PaginaInicio() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
          <span className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <img src="/icon.svg" alt="" className="size-7" />
            {marca.nombre}
          </span>
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Principal">
            <Button variant="ghost" asChild className="hidden md:inline-flex">
              <a href="#como-funciona">Cómo funciona</a>
            </Button>
            <Button variant="ghost" asChild className="hidden md:inline-flex">
              <a href="#precios">Precios</a>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/entrar">Entrar</Link>
            </Button>
            <Button asChild>
              <Link to="/registro">
                <span className="sm:hidden">Prueba gratis</span>
                <span className="hidden sm:inline">{REGISTRO}</span>
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero: el dolor y la salida a la izquierda, producto real a la derecha */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-20 lg:grid-cols-[1fr_1.05fr] lg:gap-10 lg:pt-20 lg:pb-28">
          <div className="entrada grid justify-items-start gap-6">
            <p className="text-sm font-medium text-muted-foreground">Para mueblerías, talleres y despachos de interiores</p>
            <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">Tus pedidos ya no viven en la libreta ni en el WhatsApp</h1>
            <p className="max-w-md text-lg text-pretty text-muted-foreground">
              Cotiza en minutos, cobra anticipos y manda a producir con tus proveedores. Todo en un solo lugar, y tu cliente ve el avance desde su celular.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="h-12 px-6 text-base" asChild>
                <Link to="/registro">
                  {REGISTRO} <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-6 text-base" asChild>
                <a href="#recorrido">Ver cómo se usa</a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Sin tarjeta. Desde {monedaEntera(planes.lista[0].mensual)} al mes, IVA incluido.</p>
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

        {/* Antes y después */}
        <section className="border-y bg-muted/40" aria-labelledby="titulo-antes">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
            <h2 id="titulo-antes" className="aparece max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Lo que hoy te quita el día, resuelto
            </h2>
            <div className="mt-12 overflow-hidden rounded-2xl border bg-background">
              <div className="hidden grid-cols-2 border-b text-sm font-medium sm:grid">
                <p className="px-6 py-3 text-muted-foreground">Hoy</p>
                <p className="border-l px-6 py-3">Con {marca.nombre}</p>
              </div>
              <ul className="divide-y">
                {ANTES_DESPUES.map((f) => (
                  <li key={f.antes} className="aparece grid sm:grid-cols-2">
                    <p className="flex gap-3 px-6 pt-4 text-muted-foreground sm:py-4">
                      <X className="mt-1 size-4 shrink-0" aria-hidden />
                      <span>
                        <span className="sr-only">Hoy: </span>
                        {f.antes}
                      </span>
                    </p>
                    <p className="flex gap-3 px-6 pt-2 pb-4 sm:border-l sm:py-4">
                      <Check className="mt-1 size-4 shrink-0" aria-hidden />
                      <span>
                        <span className="sr-only">Con {marca.nombre}: </span>
                        {f.despues}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Recorrido con capturas reales */}
        <section id="recorrido" className="mx-auto grid max-w-6xl scroll-mt-20 gap-12 px-4 py-20 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:items-center" aria-labelledby="titulo-recorrido">
          <div className="aparece grid content-start gap-5">
            <h2 id="titulo-recorrido" className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Así se ve un pedido de principio a fin
            </h2>
            <p className="max-w-[55ch] text-pretty text-muted-foreground">
              Son pantallas reales de {marca.nombre} con una mueblería de ejemplo: la misma cotización pasa al taller y llega al celular de tu cliente.
            </p>
          </div>
          <Recorrido />
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

        {/* Cómo empezar */}
        <section className="border-y bg-muted/40" aria-labelledby="titulo-empezar">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
            <h2 id="titulo-empezar" className="aparece max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Empieza hoy, en 3 pasos
            </h2>
            <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {PASOS_INICIO.map((p, i) => (
                <li key={p.titulo} className="aparece grid content-start gap-3">
                  <span className="text-sm font-medium text-muted-foreground tabular">Paso {i + 1}</span>
                  <p.icono className="size-6" strokeWidth={1.75} aria-hidden />
                  <h3 className="text-lg font-semibold">{p.titulo}</h3>
                  <p className="text-sm text-pretty text-muted-foreground">{p.texto}</p>
                </li>
              ))}
            </ol>
            <Button size="lg" className="aparece mt-12 h-12 px-6 text-base" asChild>
              <Link to="/registro">
                {REGISTRO} <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </section>

        {/* Precios */}
        <section id="precios" className="scroll-mt-20" aria-labelledby="titulo-precios">
          <div className="mx-auto grid max-w-5xl gap-8 px-4 py-20 sm:py-24">
            <div className="text-center">
              <h2 id="titulo-precios" className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Precios
              </h2>
              <p className="mt-3 text-muted-foreground">
                Precios en pesos con IVA incluido. {planes.diasPrueba} días de prueba, sin tarjeta.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {planes.lista.map((p) => (
                <Precio key={p.id} plan={p} />
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              ¿Necesitas más? Cada usuario adicional cuesta <span className="tabular">{monedaEntera(planes.extra.mensual)}</span> al mes, de oficina o proveedor.
            </p>
            <ul className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
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
            <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-balance">Cierra la libreta. Tu próxima cotización sale en minutos.</h2>
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
