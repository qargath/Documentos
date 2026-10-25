import { useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { mergeTone } from './MergePanel'

export function FileDeck({
  files,
  cardWidth,
  selectedId,
  onSelect,
  onReorder,
}: {
  files: { id: string; name: string; pageCount: number }[]
  cardWidth: number
  selectedId: string | null
  onSelect: (id: string) => void
  onReorder: (activeId: string, overId: string) => void
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const skipClick = useRef(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const active = files.find((file) => file.id === activeId) ?? null
  const activeIndex = files.findIndex((file) => file.id === activeId)

  function onDragStart(event: DragStartEvent) {
    skipClick.current = true
    setActiveId(String(event.active.id))
  }

  function finishDrag(event?: DragEndEvent) {
    setActiveId(null)
    if (event?.over && event.active.id !== event.over.id) onReorder(String(event.active.id), String(event.over.id))
    window.setTimeout(() => {
      skipClick.current = false
    }, 0)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={finishDrag}
      onDragCancel={() => finishDrag()}
    >
      <SortableContext items={files.map((file) => file.id)} strategy={rectSortingStrategy}>
        <ol
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(cardWidth, 168)}px, 1fr))` }}
          aria-label="Archivos por unir"
        >
          {files.map((file, index) => (
            <FileCard
              key={file.id}
              file={file}
              place={index + 1}
              tone={mergeTone(index)}
              selected={file.id === selectedId}
              skipClick={skipClick}
              onSelect={onSelect}
            />
          ))}
        </ol>
      </SortableContext>
      <DragOverlay>
        {active ? (
          <div className="rotate-1 cursor-grabbing shadow-2xl">
            <FileFace file={active} place={activeIndex + 1} tone={mergeTone(Math.max(0, activeIndex))} selected />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function FileCard({
  file,
  place,
  tone,
  selected,
  skipClick,
  onSelect,
}: {
  file: { id: string; name: string; pageCount: number }
  place: number
  tone: string
  selected: boolean
  skipClick: { current: boolean }
  onSelect: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: file.id })
  const sheets = `${file.pageCount} ${file.pageCount === 1 ? 'página' : 'páginas'}`
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'opacity-40' : undefined}
      data-id={file.id}
    >
      <button
        type="button"
        className="w-full cursor-grab rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stamp active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label={`${file.name}, ${sheets}, lugar ${place}. Arrástralo para mover el archivo entero.`}
        aria-pressed={selected}
        onClick={() => {
          if (skipClick.current) {
            skipClick.current = false
            return
          }
          onSelect(file.id)
        }}
      >
        <FileFace file={file} place={place} tone={tone} selected={selected} />
      </button>
    </li>
  )
}

function FileFace({
  file,
  place,
  tone,
  selected,
}: {
  file: { id: string; name: string; pageCount: number }
  place: number
  tone: string
  selected: boolean
}) {
  const sheets = `${file.pageCount} ${file.pageCount === 1 ? 'página' : 'páginas'}`
  return (
    <div>
      <div className="relative h-40">
        <div className="absolute inset-x-4 top-0 h-32 rounded-2xl border border-[#e3d9cc] bg-sheet shadow-sm" />
        <div className="absolute inset-x-2 top-2 h-32 rounded-2xl border border-[#e3d9cc] bg-sheet shadow-sm" />
        <div
          className={`absolute inset-x-0 top-4 flex h-32 flex-col justify-between rounded-2xl border bg-sheet p-4 shadow-[0_10px_30px_rgba(60,40,20,0.05)] ${
            selected ? 'border-stamp ring-2 ring-stamp' : 'border-[#e3d9cc]'
          }`}
        >
          <span className={`h-3 w-3 rounded-full ${tone}`} aria-hidden="true" />
          <span className="truncate font-display text-xl text-[#211c18]" title={file.name}>
            {file.name}
          </span>
        </div>
      </div>
      <p className="mt-2 text-center text-sm text-muted">{sheets}</p>
      <p className="text-center text-xs text-muted">Lugar {place}</p>
    </div>
  )
}
