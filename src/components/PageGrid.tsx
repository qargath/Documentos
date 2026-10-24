import { useRef, useState, type RefObject } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type Modifier,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  type SortingStrategy,
} from '@dnd-kit/sortable'
import { CSS, getEventCoordinates } from '@dnd-kit/utilities'
import { moveGroup } from '../order'
import type { PageItem } from '../state'

const snapCenterToCursor: Modifier = ({ activatorEvent, draggingNodeRect, transform }) => {
  if (!draggingNodeRect || !activatorEvent) return transform
  const point = getEventCoordinates(activatorEvent)
  if (!point) return transform
  return {
    ...transform,
    x: transform.x + point.x - draggingNodeRect.left - draggingNodeRect.width / 2,
    y: transform.y + point.y - draggingNodeRect.top - draggingNodeRect.height / 2,
  }
}

const closestPointer: CollisionDetection = ({
  active,
  collisionRect,
  droppableContainers,
  droppableRects,
  pointerCoordinates,
}) => {
  if (!pointerCoordinates) {
    return closestCenter({ active, collisionRect, droppableContainers, droppableRects, pointerCoordinates })
  }
  const hits: { id: string | number; data: { droppableContainer: (typeof droppableContainers)[number]; value: number } }[] = []
  for (const droppableContainer of droppableContainers) {
    const rect = droppableRects.get(droppableContainer.id)
    if (!rect) continue
    const dx = rect.left + rect.width / 2 - pointerCoordinates.x
    const dy = rect.top + rect.height / 2 - pointerCoordinates.y
    hits.push({ id: droppableContainer.id, data: { droppableContainer, value: Math.hypot(dx, dy) } })
  }
  hits.sort((left, right) => left.data.value - right.data.value)
  return hits
}

function groupPreviewStrategy(pages: PageItem[], selectedIds: string[]): SortingStrategy {
  return ({ rects, activeIndex, overIndex, index }) => {
    const current = rects[index]
    const activeId = pages[activeIndex]?.id
    const overId = pages[overIndex]?.id
    if (!current || !activeId || !overId) return null
    const next = moveGroup(pages, selectedIds, activeId, overId)
    const newIndex = next.findIndex((page) => page.id === pages[index]?.id)
    const target = rects[newIndex]
    if (!target || newIndex < 0) return null
    return { x: target.left - current.left, y: target.top - current.top, scaleX: 1, scaleY: 1 }
  }
}

interface PageGridProps {
  pages: PageItem[]
  thumbs: string[]
  cardWidth: number
  selectedIds: string[]
  onSelect: (id: string, mode: 'replace' | 'toggle' | 'range') => void
  onReorder: (activeId: string, overId: string) => void
  thumbAlign?: 'source' | 'order'
  badges?: string[]
  notes?: string[]
  accents?: string[]
}

export function PageGrid({
  pages,
  thumbs,
  cardWidth,
  selectedIds,
  onSelect,
  onReorder,
  thumbAlign = 'source',
  badges,
  notes,
  accents,
}: PageGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overlayWidth, setOverlayWidth] = useState(cardWidth)
  const skipClick = useRef(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const selected = new Set(selectedIds)
  const active = pages.find((page) => page.id === activeId) ?? null
  const groupCount = active && selected.has(active.id) ? selectedIds.length : active ? 1 : 0
  const grouping = groupCount > 1

  function onDragStart(event: DragStartEvent) {
    skipClick.current = true
    const id = String(event.active.id)
    const node = document.querySelector(`[data-id="${id}"]`)
    if (node instanceof HTMLElement) setOverlayWidth(node.getBoundingClientRect().width)
    setActiveId(id)
  }

  function finishDrag(event?: DragEndEvent) {
    setActiveId(null)
    if (event?.over && event.active.id !== event.over.id) {
      onReorder(String(event.active.id), String(event.over.id))
    }
    window.setTimeout(() => {
      skipClick.current = false
    }, 0)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={grouping ? closestPointer : closestCenter}
      onDragStart={onDragStart}
      onDragEnd={finishDrag}
      onDragCancel={() => finishDrag()}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            'Para tomar una página, pulsa espacio. Muévela con las flechas. Pulsa espacio otra vez para soltarla, o escape para cancelar. Si hay varias marcadas, se mueven juntas.',
        },
        announcements: {
          onDragStart({ active: dragged }) {
            const page = pages.find((item) => item.id === dragged.id)
            if (!page) return 'Tomaste una página.'
            const count = selected.has(page.id) ? selectedIds.length : 1
            return count > 1
              ? `Tomaste ${count} páginas. Conservan su orden.`
              : `Tomaste la página ${page.sourceIndex + 1}.`
          },
          onDragOver({ over }) {
            if (!over) return 'El lote ya no está sobre un lugar.'
            const place = pages.findIndex((item) => item.id === over.id) + 1
            return place > 0 ? `Sobre el lugar ${place}.` : 'Sobre otra página.'
          },
          onDragEnd({ over }) {
            if (!over) return 'Se canceló el movimiento.'
            return groupCount > 1 ? 'El lote cambió de lugar.' : 'La página cambió de lugar.'
          },
          onDragCancel() {
            return 'Se canceló el movimiento.'
          },
        },
      }}
    >
      <SortableContext
        items={pages.map((page) => page.id)}
        strategy={grouping ? groupPreviewStrategy(pages, selectedIds) : rectSortingStrategy}
      >
        <ol
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}px, 1fr))` }}
        >
          {pages.map((page, index) => (
            <SortablePage
              key={page.id}
              page={page}
              place={index + 1}
              thumb={thumbs[thumbAlign === 'order' ? index : page.sourceIndex] ?? ''}
              badge={badges?.[index]}
              note={notes?.[index]}
              accent={accents?.[index]}
              selected={selected.has(page.id)}
              concealed={grouping && selected.has(page.id) && page.id !== activeId}
              held={grouping && page.id === activeId}
              skipClick={skipClick}
              onSelect={onSelect}
            />
          ))}
        </ol>
      </SortableContext>
      <DragOverlay modifiers={grouping ? [snapCenterToCursor] : undefined}>
        {active ? (
          <div className="relative cursor-grabbing" style={{ width: overlayWidth }}>
            {grouping ? (
              <>
                <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-2xl border border-line bg-card shadow-md" />
                <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-2xl border border-line bg-card shadow-md" />
              </>
            ) : null}
            <div className={`relative ${grouping ? 'rotate-1 shadow-2xl' : 'rotate-2 shadow-2xl'}`}>
              <PageFace
                page={active}
                place={pages.findIndex((page) => page.id === active.id) + 1}
                thumb={thumbs[thumbAlign === 'order' ? pages.findIndex((page) => page.id === active.id) : active.sourceIndex] ?? ''}
                badge={badges?.[pages.findIndex((page) => page.id === active.id)]}
                note={notes?.[pages.findIndex((page) => page.id === active.id)]}
                accent={accents?.[pages.findIndex((page) => page.id === active.id)]}
                selected
              />
              {grouping ? (
                <span className="absolute -top-2 -right-2 grid h-7 min-w-7 place-items-center rounded-full bg-stamp px-2 text-xs font-semibold text-white">
                  {groupCount}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function SortablePage({
  page,
  place,
  thumb,
  badge,
  note,
  accent,
  selected,
  concealed,
  held,
  skipClick,
  onSelect,
}: {
  page: PageItem
  place: number
  thumb: string
  badge?: string
  note?: string
  accent?: string
  selected: boolean
  concealed: boolean
  held: boolean
  skipClick: RefObject<boolean>
  onSelect: (id: string, mode: 'replace' | 'toggle' | 'range') => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.id,
  })

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        visibility: concealed ? 'hidden' : undefined,
      }}
      className={held ? 'opacity-0' : !concealed && isDragging ? 'opacity-40' : undefined}
      data-id={page.id}
      data-page={page.sourceIndex + 1}
      data-place={place}
      data-selected={selected ? 'true' : 'false'}
    >
      <button
        type="button"
        className="w-full cursor-grab rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stamp active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label={`Página ${page.sourceIndex + 1}, ahora en el lugar ${place}. ${selected ? 'Está marcada.' : ''} Arrástrala para moverla.`}
        aria-pressed={selected}
        tabIndex={concealed ? -1 : undefined}
        onClick={(event) => {
          if (skipClick.current) {
            skipClick.current = false
            return
          }
          const mode = event.shiftKey ? 'range' : event.ctrlKey || event.metaKey ? 'toggle' : 'replace'
          onSelect(page.id, mode)
        }}
      >
        <PageFace page={page} place={place} thumb={thumb} badge={badge} note={note} accent={accent} selected={selected} />
      </button>
    </li>
  )
}

function PageFace({
  page,
  place,
  thumb,
  badge,
  note,
  accent,
  selected,
}: {
  page: PageItem
  place: number
  thumb: string
  badge?: string
  note?: string
  accent?: string
  selected: boolean
}) {
  return (
    <div
      className={`rounded-2xl border bg-card p-2 shadow-[0_10px_30px_rgba(60,40,20,0.05)] ${
        selected ? 'border-stamp ring-2 ring-stamp' : 'border-line'
      }`}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-[#f4efe6]">
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-contain" draggable={false} />
        ) : (
          <div className="h-full w-full animate-pulse bg-[#efe6da]" />
        )}
        <span className="absolute top-2 left-2 rounded-md bg-ink/90 px-1.5 py-0.5 text-[11px] font-semibold text-white">
          {badge ?? `pág. ${page.sourceIndex + 1}`}
        </span>
      </div>
      <p className="mt-2 truncate text-center text-sm text-muted">Lugar {place}</p>
      {note ? (
        <p className="mt-0.5 flex items-center justify-center gap-1 truncate text-xs text-muted" title={note}>
          {accent ? <span className={`h-2 w-2 shrink-0 rounded-full ${accent}`} aria-hidden="true" /> : null}
          <span className="truncate">{note}</span>
        </p>
      ) : null}
    </div>
  )
}
