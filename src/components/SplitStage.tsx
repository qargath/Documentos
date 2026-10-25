import { useEffect, useRef, useState } from 'react'
import { equalCutIndexes, everyCutIndexes } from '../split'
import { Icon, splitIcons } from './icons'

interface SplitPage {
  id: string
  sourceIndex: number
}

interface NodeDrag {
  pointerId: number
  pageId: string
  origin: number
  over: number
  startX: number
  moved: boolean
}

export function SplitStage({
  pages,
  thumbs,
  cuts,
  onCuts,
}: {
  pages: SplitPage[]
  thumbs: string[]
  cuts: string[]
  onCuts: (ids: string[]) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const deckRef = useRef<HTMLDivElement>(null)
  const everyRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<NodeDrag | null>(null)
  const [drag, setDrag] = useState<NodeDrag | null>(null)
  const [customOpen, setCustomOpen] = useState(false)
  const [everyText, setEveryText] = useState('10')
  const [box, setBox] = useState({ width: 0, height: 0 })
  const parts = groups(pages, cuts)
  const cutAt = new Map<string, number>()
  pages.forEach((page, index) => {
    if (cuts.includes(page.id) && index < pages.length - 1) cutAt.set(page.id, index)
  })
  const current = [...cutAt.values()].sort((a, b) => a - b)
  const firstNumber = (pages[0]?.sourceIndex ?? 0) + 1
  const lastNumber = (pages.at(-1)?.sourceIndex ?? 0) + 1
  const half = equalCutIndexes(pages.length, 2)
  const thirds = equalCutIndexes(pages.length, 3)
  const fourths = equalCutIndexes(pages.length, 4)
  const named =
    sameIndexes(current, half) || sameIndexes(current, thirds) || sameIndexes(current, fourths)
  const customActive = !named && sameIndexes(current, everyCutIndexes(pages.length, current[0] == null ? 0 : current[0] + 1))

  useEffect(() => {
    const deck = deckRef.current
    if (!deck) return
    const measure = () => {
      const width = deck.clientWidth
      const height = deck.clientHeight
      setBox((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(deck)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!customOpen) return
    const max = Math.max(pages.length - 1, 1)
    setEveryText((text) => {
      const size = Math.floor(Number(text))
      if (!Number.isFinite(size) || size < 1) return String(Math.min(10, max))
      return String(Math.min(size, max))
    })
    everyRef.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      setCustomOpen(false)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [customOpen, pages.length])

  function putDrag(next: NodeDrag | null) {
    dragRef.current = next
    setDrag(next)
  }

  function indexAt(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || rect.width <= 0 || pages.length < 2) return null
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const after = Math.round(ratio * pages.length) - 1
    if (after < 0 || after >= pages.length - 1) return null
    return after
  }

  function applyIndexes(indexes: number[]) {
    onCuts(indexes.map((index) => pages[index]?.id).filter((id): id is string => Boolean(id)))
  }

  function addCut(after: number) {
    const id = pages[after]?.id
    if (!id || cutAt.has(id)) return
    onCuts([...cuts, id])
  }

  function moveCut(fromId: string, toIndex: number) {
    const target = pages[toIndex]?.id
    if (!target || target === fromId || cutAt.has(target)) return
    onCuts(cuts.map((id) => (id === fromId ? target : id)))
  }

  function applyEvery() {
    const size = Math.floor(Number(everyText))
    if (!Number.isFinite(size) || size < 1 || size >= pages.length) return
    applyIndexes(everyCutIndexes(pages.length, size))
    setCustomOpen(false)
  }

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 self-center rounded-[14px] border-[1.5px] border-line bg-card px-2.5 py-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        <span className="border-r border-line pr-2.5 text-[11px] font-bold tracking-[0.08em] text-gold uppercase">
          Partir en:
        </span>
        <PresetButton
          label="A la mitad (½)"
          title={presetTitle(pages.length, 2)}
          svg={splitIcons.half}
          active={sameIndexes(current, half)}
          disabled={half.length === 0}
          onClick={() => applyIndexes(half)}
        />
        <PresetButton
          label="En 3"
          title={presetTitle(pages.length, 3)}
          svg={splitIcons.three}
          active={sameIndexes(current, thirds)}
          disabled={thirds.length === 0}
          onClick={() => applyIndexes(thirds)}
        />
        <PresetButton
          label="En 4"
          title={presetTitle(pages.length, 4)}
          svg={splitIcons.four}
          active={sameIndexes(current, fourths)}
          disabled={fourths.length === 0}
          onClick={() => applyIndexes(fourths)}
        />
        <PresetButton
          label="Cada N págs..."
          title="Configurar corte personalizado"
          svg={splitIcons.custom}
          active={customActive}
          disabled={pages.length < 2}
          onClick={() => setCustomOpen(true)}
        />
        <button
          type="button"
          title="Eliminar todos los cortes"
          className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-[#f2d7d5] bg-raise px-2.5 text-[12.5px] font-medium text-[#b03a2e] hover:border-[#b03a2e] hover:bg-[#fdedec] hover:text-[#78281f] disabled:opacity-40"
          disabled={current.length === 0}
          onClick={() => onCuts([])}
        >
          <Icon svg={splitIcons.clear} className="h-[15px] w-[15px]" />
          Sin cortes
        </button>
      </div>

      <div ref={deckRef} className="relative min-h-0 min-w-0 w-full flex-1 overflow-hidden">
        <DeckBoard parts={parts} pages={pages} thumbs={thumbs} width={box.width} height={box.height} />
      </div>

      <section className="shrink-0 rounded-2xl border-[1.5px] border-line bg-card px-5 py-4 shadow-[0_4px_16px_rgba(0,0,0,0.03)]">
        <div className="mb-2.5 flex items-center justify-between gap-3 text-[11px] text-muted">
          <h2 className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.1em] text-quiet uppercase">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 6h18v12H3z" />
              <path d="M7 6v4m5-4v6m5-6v4" />
            </svg>
            Regla técnica de división ({pages.length} {pages.length === 1 ? 'página' : 'páginas'})
          </h2>
          <p>Toca el riel para crear un corte · Toca la cuchilla para eliminarla</p>
        </div>
        <div ref={trackRef} className="relative">
          <div className="relative flex h-12 overflow-hidden rounded-[10px] border border-line bg-track shadow-[inset_0_2px_6px_rgba(0,0,0,0.05)]">
            {parts.map((part, index) => {
              const first = part[0]
              const last = part.at(-1) ?? first
              if (!first || !last) return null
              const start = first.sourceIndex + 1
              const end = last.sourceIndex + 1
              return (
                <button
                  key={first.id}
                  type="button"
                  className={`relative flex h-full min-w-0 cursor-crosshair flex-col items-center justify-center overflow-hidden border-r border-black/5 px-1 hover:bg-[rgba(194,81,39,0.22)] ${
                    index % 2 === 0 ? 'bg-[rgba(194,81,39,0.12)]' : 'bg-[rgba(194,81,39,0.05)]'
                  }`}
                  style={{ flex: `${part.length} 1 0` }}
                  aria-label={`Cortar junto a las páginas ${start} a ${end}`}
                  onPointerDown={(event) => {
                    if (event.button !== 0) return
                    const after = indexAt(event.clientX)
                    if (after == null) return
                    addCut(after)
                  }}
                >
                  {parts.length <= 8 ? (
                    <>
                      <span className="pointer-events-none truncate text-[11px] font-semibold text-ink">Parte {index + 1}</span>
                      <span className="pointer-events-none truncate text-[9px] text-quiet">
                        {part.length} {part.length === 1 ? 'pág' : 'págs'} ({start === end ? start : `${start}-${end}`})
                      </span>
                    </>
                  ) : null}
                </button>
              )
            })}
            <div className="pointer-events-none absolute inset-x-1 bottom-0 flex h-1.5 items-end justify-between opacity-40">
              {pages.map((page, index) => (
                <span key={page.id} className={`w-px bg-ink ${index % 5 === 0 ? 'h-1.5' : 'h-1'}`} />
              ))}
            </div>
          </div>
          {[...cutAt.entries()].map(([id, index]) => {
            const place = drag?.pageId === id ? drag.over : index
            const number = (pages[index]?.sourceIndex ?? index) + 1
            return (
              <button
                key={id}
                type="button"
                data-node="true"
                className="group absolute -top-1.5 -bottom-1.5 z-20 flex w-4 -translate-x-1/2 cursor-grab flex-col items-center active:cursor-grabbing"
                style={{ left: `${((place + 1) / pages.length) * 100}%` }}
                aria-label={`Quitar el corte después de la página ${number}`}
                onPointerDown={(event) => {
                  if (event.button !== 0) return
                  event.stopPropagation()
                  event.currentTarget.setPointerCapture(event.pointerId)
                  putDrag({
                    pointerId: event.pointerId,
                    pageId: id,
                    origin: index,
                    over: index,
                    startX: event.clientX,
                    moved: false,
                  })
                }}
                onPointerMove={(event) => {
                  const currentDrag = dragRef.current
                  if (!currentDrag || currentDrag.pointerId !== event.pointerId || currentDrag.pageId !== id) return
                  const over = indexAt(event.clientX)
                  putDrag({
                    ...currentDrag,
                    over: over ?? currentDrag.over,
                    moved: currentDrag.moved || Math.abs(event.clientX - currentDrag.startX) > 4,
                  })
                }}
                onPointerUp={(event) => {
                  const currentDrag = dragRef.current
                  if (!currentDrag || currentDrag.pointerId !== event.pointerId || currentDrag.pageId !== id) return
                  if (!currentDrag.moved) onCuts(cuts.filter((cut) => cut !== id))
                  else if (currentDrag.over !== currentDrag.origin) moveCut(id, currentDrag.over)
                  putDrag(null)
                }}
                onPointerCancel={() => putDrag(null)}
              >
                <span
                  className="h-3.5 w-4 origin-top bg-stamp shadow-[0_2px_5px_rgba(0,0,0,0.25)] transition group-hover:scale-125 group-hover:bg-[#e63946]"
                  style={{ clipPath: 'polygon(0 0, 100% 0, 100% 65%, 50% 100%, 0 65%)' }}
                />
                <span className="w-0.5 flex-1 bg-stamp shadow-[0_0_3px_rgba(194,81,39,0.4)] group-hover:bg-[#e63946]" />
                <span className="h-1 w-2 rounded-sm bg-stamp group-hover:bg-[#e63946]" />
                <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 rounded bg-[#1f1d1a] px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-white shadow-[0_3px_8px_rgba(0,0,0,0.2)] group-hover:block">
                  Corte en pág. {number} · toca para quitar
                </span>
              </button>
            )
          })}
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted">
          <span>Página {firstNumber}</span>
          <span className="font-semibold text-stamp">
            {parts.length} {parts.length === 1 ? 'parte resultante' : 'partes resultantes'}
          </span>
          <span>Página {lastNumber}</span>
        </div>
      </section>

      {customOpen ? (
        <div className="absolute inset-0 z-30 grid place-items-center bg-ink/25 px-4" onClick={() => setCustomOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="corte-personalizado"
            className="w-full max-w-[290px] rounded-2xl border-[1.5px] border-line bg-card p-5 shadow-[0_10px_30px_rgba(0,0,0,0.15)]"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="corte-personalizado" className="font-display text-lg">
              Corte personalizado
            </h3>
            <p className="mt-1 text-xs leading-snug text-muted">Elige cuántas páginas tendrá cada archivo como máximo.</p>
            <label className="mt-3 flex items-center gap-2 text-sm">
              Dividir cada
              <input
                ref={everyRef}
                type="number"
                min={1}
                max={Math.max(pages.length - 1, 1)}
                value={everyText}
                aria-label="Páginas por archivo"
                className="w-16 rounded-md border border-line bg-raise px-2 py-1 text-center font-semibold"
                onChange={(event) => setEveryText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') applyEvery()
                }}
              />
              páginas
            </label>
            <div className="mt-4 flex gap-2">
              <button type="button" className="h-[34px] flex-1 rounded-lg bg-stamp text-xs font-semibold text-white" onClick={applyEvery}>
                Aplicar corte
              </button>
              <button
                type="button"
                className="h-[34px] rounded-lg border border-line bg-raise px-3 text-xs"
                onClick={() => setCustomOpen(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function DeckBoard({
  parts,
  pages,
  thumbs,
  width,
  height,
}: {
  parts: SplitPage[][]
  pages: SplitPage[]
  thumbs: string[]
  width: number
  height: number
}) {
  const layout = chooseDeck(parts.length, Math.max(0, width - 8), Math.max(0, height - 8))
  const cards = parts.map((part) => {
    const view = partView(part, pages, thumbs)
    if (!view) return null
    if (layout.mode === 'fichas') return <DeckChip key={view.id} view={view} />
    return <DeckCard key={view.id} view={view} />
  })
  const board =
    layout.mode === 'fichas' ? (
      <div
        className="flex flex-wrap justify-center gap-2"
        style={{ width: layout.cols * CHIP_W + Math.max(0, layout.cols - 1) * CHIP_GAP }}
      >
        {cards}
      </div>
    ) : layout.mode === 'dos' ? (
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-end gap-3">{cards.slice(0, layout.top)}</div>
        <div className="flex items-end gap-3">{cards.slice(layout.top)}</div>
      </div>
    ) : (
      <div className="flex items-end gap-3">{cards}</div>
    )
  return (
    <div className="absolute top-1/2 left-1/2 w-max" style={{ transform: `translate(-50%, -50%) scale(${layout.scale})` }}>
      {board}
    </div>
  )
}

function DeckCard({ view }: { view: PartView }) {
  return (
    <article
      className="flex w-64 shrink-0 flex-col items-center"
      aria-label={view.start === view.end ? `1 página, la página ${view.start}` : `${countLabel(view.count)}, de la página ${view.start} a la ${view.end}`}
    >
      <Naipe count={view.count} firstThumb={view.firstThumb} lastThumb={view.lastThumb} firstNumber={view.start} lastNumber={view.end} />
      <p className="mt-2.5 text-center text-[13px] font-semibold">{countLabel(view.count)}</p>
      <p className="text-center text-[11px] text-muted">{rangeLabel(view.start, view.end)}</p>
    </article>
  )
}

function DeckChip({ view }: { view: PartView }) {
  return (
    <article
      className="flex h-16 w-[104px] shrink-0 flex-col items-center justify-center rounded-[10px] border border-line bg-raise shadow-[0_3px_8px_rgba(60,40,20,0.06)]"
      aria-label={view.start === view.end ? `1 página, la página ${view.start}` : `${countLabel(view.count)}, de la página ${view.start} a la ${view.end}`}
    >
      <p className="font-display text-lg leading-none font-bold">
        {view.start}
        <span className="mx-1 font-sans text-[11px] font-semibold text-stamp">–</span>
        {view.end}
      </p>
      <p className="text-[10px] text-muted">{countLabel(view.count)}</p>
    </article>
  )
}

function PresetButton({
  label,
  title,
  svg,
  active,
  disabled,
  onClick,
}: {
  label: string
  title: string
  svg: string
  active: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      className={`inline-flex h-[34px] items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-medium ${
        active
          ? 'border-stamp bg-stamp text-white'
          : 'border-line bg-well text-ink hover:border-stamp hover:bg-raise hover:text-stamp'
      } disabled:pointer-events-none disabled:opacity-40`}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon svg={svg} className="h-[15px] w-[15px]" />
      {label}
    </button>
  )
}

function Naipe({
  count,
  firstThumb,
  lastThumb,
  firstNumber,
  lastNumber,
}: {
  count: number
  firstThumb: string
  lastThumb: string
  firstNumber: number
  lastNumber: number
}) {
  const layers = fanLayers(count)
  return (
    <div className="relative mx-auto h-56 w-full">
      <div className="absolute bottom-0 left-1/2 h-52 w-32 -translate-x-1/2">
        {layers.map((layer, index) => {
          const face = layer.role === 'last' ? 'last' : 'first'
          const number = face === 'last' ? lastNumber : firstNumber
          const thumb = face === 'last' ? lastThumb : firstThumb
          return (
            <div
              key={`${layer.role}-${index}`}
              className="absolute inset-0 overflow-hidden rounded-xl border border-line bg-[#f7f1e6] shadow-[0_10px_18px_rgba(60,40,20,0.12)]"
              style={{ transform: `rotate(${layer.angle}deg)`, transformOrigin: '50% 100%', zIndex: layer.z }}
            >
              {layer.role === 'back' ? null : (
                <>
                  {thumb ? (
                    <img src={thumb} alt="" className="h-full w-full bg-sheet object-contain" draggable={false} />
                  ) : (
                    <div className="h-full w-full animate-pulse bg-[#efe6da]" />
                  )}
                  <span
                    className={`absolute top-1.5 rounded-md bg-[#211c18]/90 px-1.5 py-0.5 text-[10px] font-semibold text-white ${
                      face === 'last' ? 'right-1.5' : 'left-1.5'
                    }`}
                  >
                    pág. {number}
                  </span>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function fanLayers(count: number) {
  if (count <= 1) return [{ role: 'only' as const, angle: 0, z: 1 }]
  if (count === 2) {
    return [
      { role: 'first' as const, angle: -7, z: 1 },
      { role: 'last' as const, angle: 7, z: 2 },
    ]
  }
  return [
    { role: 'back' as const, angle: -4, z: 1 },
    { role: 'back' as const, angle: 0, z: 2 },
    { role: 'back' as const, angle: 4, z: 3 },
    { role: 'first' as const, angle: -12, z: 4 },
    { role: 'last' as const, angle: 12, z: 5 },
  ]
}

const NAIPE_W = 256
const NAIPE_H = 272
const NAIPE_GAP = 12
const ROW_GAP = 16
const MIN_SCALE = 0.48
const CHIP_W = 104
const CHIP_H = 64
const CHIP_GAP = 8

interface PartView {
  id: string
  count: number
  start: number
  end: number
  firstThumb: string
  lastThumb: string
}

function partView(part: SplitPage[], pages: SplitPage[], thumbs: string[]): PartView | null {
  const first = part[0]
  const last = part.at(-1) ?? first
  if (!first || !last) return null
  return {
    id: first.id,
    count: part.length,
    start: first.sourceIndex + 1,
    end: last.sourceIndex + 1,
    firstThumb: thumbs[pages.findIndex((page) => page.id === first.id)] ?? '',
    lastThumb: thumbs[pages.findIndex((page) => page.id === last.id)] ?? '',
  }
}

function fitScale(width: number, height: number, availW: number, availH: number) {
  if (width <= 0 || height <= 0 || availW <= 0 || availH <= 0) return 1
  return Math.min(1, availW / width, availH / height)
}

function rowWidth(count: number) {
  if (count <= 0) return 0
  return count * NAIPE_W + Math.max(0, count - 1) * NAIPE_GAP
}

function chooseDeck(count: number, availW: number, availH: number) {
  if (availW <= 0 || availH <= 0) return { mode: 'una' as const, scale: 1 }
  const one = fitScale(rowWidth(count), NAIPE_H, availW, availH)
  if (count <= 1 || one >= MIN_SCALE) return { mode: 'una' as const, scale: count <= 1 ? Math.min(1, one) : one }
  const top = Math.ceil(count / 2)
  const two = fitScale(rowWidth(top), NAIPE_H * 2 + ROW_GAP, availW, availH)
  if (two >= MIN_SCALE) return { mode: 'dos' as const, scale: two, top }
  let best = { cols: Math.max(count, 1), scale: 0 }
  for (let cols = 1; cols <= count; cols += 1) {
    const rows = Math.ceil(count / cols)
    const width = cols * CHIP_W + (cols - 1) * CHIP_GAP
    const height = rows * CHIP_H + (rows - 1) * CHIP_GAP
    const scale = fitScale(width, height, availW, availH)
    if (scale > best.scale) best = { cols, scale }
  }
  return { mode: 'fichas' as const, scale: best.scale || 1, cols: best.cols }
}

function groups<T extends { id: string }>(pages: T[], cuts: string[]) {
  const marks = new Set(cuts)
  const parts: T[][] = [[]]
  pages.forEach((page, index) => {
    parts.at(-1)?.push(page)
    if (index < pages.length - 1 && marks.has(page.id)) parts.push([])
  })
  return parts.filter((part) => part.length > 0)
}

function sameIndexes(current: number[], expected: number[]) {
  return current.length === expected.length && current.every((index, place) => index === expected[place])
}

function countLabel(count: number) {
  return count === 1 ? '1 página' : `${count} páginas`
}

function rangeLabel(first: number, last: number) {
  if (first === last) return `pág. ${first}`
  return `pág. ${first} – ${last}`
}

function presetTitle(pageCount: number, parts: number) {
  const step = Math.floor(pageCount / parts)
  if (step < 1) return ''
  const last = pageCount - step * (parts - 1)
  const size = step === last ? `${step} páginas cada una` : `${step} y ${last} páginas`
  return `Dividir en ${parts} partes: ${size}`
}
