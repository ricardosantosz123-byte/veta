import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props<T extends { id: string }> {
  items: T[]
  /** Etiqueta para lectores de pantalla, p. ej. "categoría". */
  nombre: (item: T) => string
  render: (item: T) => ReactNode
  onReordenar: (ids: string[]) => Promise<unknown>
  deshabilitado?: boolean
  className?: string
}

function Fila({ id, etiqueta, deshabilitado, children }: { id: string; etiqueta: string; deshabilitado?: boolean; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: deshabilitado,
  })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('flex items-center gap-2 bg-card py-2', isDragging && 'relative z-10 rounded-lg shadow-sm ring-1 ring-border')}
    >
      {!deshabilitado && (
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none active:cursor-grabbing"
          aria-label={`Mover ${etiqueta}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  )
}

/** Lista que se reordena arrastrando (mouse, dedo o teclado: espacio, flechas, espacio). */
export function ListaOrdenable<T extends { id: string }>({ items, nombre, render, onReordenar, deshabilitado, className }: Props<T>) {
  // Orden optimista mientras se guarda; si falla, vuelve al que manda el servidor.
  const [local, setLocal] = useState<string[] | null>(null)
  const porId = new Map(items.map((i) => [i.id, i]))
  const ordenados = local ? local.map((id) => porId.get(id)).filter((x): x is T => !!x) : items

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  async function alSoltar({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const ids = ordenados.map((i) => i.id)
    const nuevo = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)))
    setLocal(nuevo)
    try {
      await onReordenar(nuevo)
    } finally {
      setLocal(null)
    }
  }

  return (
    <DndContext
      sensors={sensores}
      collisionDetection={closestCenter}
      onDragEnd={alSoltar}
      accessibility={{
        screenReaderInstructions: {
          draggable: 'Para mover, presiona espacio. Usa las flechas para cambiar de lugar y espacio otra vez para soltar. Escape cancela.',
        },
        announcements: {
          onDragStart: ({ active }) => `Tomaste ${nombre(porId.get(String(active.id))!)}.`,
          onDragOver: ({ over }) => (over ? `Sobre la posición de ${nombre(porId.get(String(over.id))!)}.` : 'Fuera de la lista.'),
          onDragEnd: ({ over }) => (over ? 'Orden actualizado.' : 'Movimiento cancelado.'),
          onDragCancel: () => 'Movimiento cancelado.',
        },
      }}
    >
      <SortableContext items={ordenados.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className={cn('divide-y', className)}>
          {ordenados.map((item) => (
            <Fila key={item.id} id={item.id} etiqueta={nombre(item)} deshabilitado={deshabilitado}>
              {render(item)}
            </Fila>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
