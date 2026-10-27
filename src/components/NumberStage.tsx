import { useRef, useState } from 'react'
import {
  NUMBER_FACES,
  NUMBER_SIZE,
  edgeSide,
  faceCss,
  planNumbers,
  previewAnchor,
  type NumberFace,
  type NumberZone,
} from '../numbering'

export type NumberMode = 'automatico' | 'asistido'
export type NumberStep = 'modo' | 'config' | 'seleccion' | 'insercion' | 'previa'

const zones: { id: NumberZone; label: string }[] = [
  { id: 'cabecera', label: 'Cabecera' },
  { id: 'pie', label: 'Pie' },
  { id: 'interno', label: 'Borde interno' },
  { id: 'externo', label: 'Borde externo' },
]

export function NumberStage({
  pages,
  thumbs,
  cardWidth,
  step,
  mode,
  fromPage,
  startAt,
  zone,
  align,
  size,
  face,
  excluded,
  sampleId,
  onMode,
  onFromPage,
  onStartAt,
  onZone,
  onAlign,
  onSize,
  onFace,
  onToggle,
  onStep,
}: {
  pages: { id: string }[]
  thumbs: string[]
  cardWidth: number
  step: NumberStep
  mode: NumberMode | null
  fromPage: number
  startAt: number
  zone: NumberZone
  align: number
  size: number
  face: NumberFace
  excluded: string[]
  sampleId: string | null
  onMode: (mode: NumberMode) => void
  onFromPage: (value: number) => void
  onStartAt: (value: number) => void
  onZone: (zone: NumberZone) => void
  onAlign: (value: number) => void
  onSize: (value: number) => void
  onFace: (face: NumberFace) => void
  onToggle: (id: string) => void
  onStep: (step: NumberStep) => void
}) {
  const hidden = new Set(pages.flatMap((page, index) => (excluded.includes(page.id) ? [index] : [])))
  const marks = planNumbers(pages.length, fromPage, startAt, hidden)
  const sampleIndex = Math.max(0, pages.findIndex((page) => page.id === sampleId))
  const [facing, setFacing] = useState(false)
  const opposite = pages.findIndex((_, index) => index !== sampleIndex && index % 2 !== sampleIndex % 2)
  const shownIndex = facing && opposite >= 0 ? opposite : sampleIndex

  if (step === 'modo') {
    return (
      <section className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
        <ModeCard
          title="Automático"
          text="Pregunta la posición, desde qué página y en qué número. El número va en todas las páginas. Arial, 12 pt. Se descarga una copia."
          onClick={() => onMode('automatico')}
        />
        <ModeCard
          title="Asistido"
          text="Eliges desde qué página y en qué número. Luego quitas las páginas donde no quieres verlo, acomodas el número y revisas el resultado. Se descarga una copia."
          onClick={() => onMode('asistido')}
        />
      </section>
    )
  }

  if (step === 'config') {
    return (
      <section className="mx-auto max-w-xl space-y-6">
        <StepBack label="Elegir modo" onClick={() => onStep('modo')} />
        <header>
          <h2 className="font-display text-2xl">{mode === 'asistido' ? 'Asistido' : 'Automático'}</h2>
          <p className="mt-1 text-sm text-muted">
            {mode === 'asistido'
              ? 'El número de las páginas que quites después igual avanza.'
              : 'El número se imprime en todas las páginas, desde la que indiques. Arial, 12 pt.'}
          </p>
        </header>
        {mode === 'automatico' ? (
          <fieldset>
            <legend className="text-[11px] font-semibold tracking-[0.12em] text-gold uppercase">Posición</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {zones.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={zone === item.id}
                  className={`rounded-xl border px-3 py-3 text-sm ${
                    zone === item.id ? 'border-stamp bg-stamp text-white' : 'border-line bg-raise text-ink hover:bg-well'
                  }`}
                  onClick={() => onZone(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Desde la página"
            value={fromPage}
            min={1}
            max={pages.length}
            onChange={onFromPage}
          />
          <Field label="Empieza en el número" value={startAt} min={0} max={99999} onChange={onStartAt} />
        </div>
        {mode === 'asistido' ? (
          <button
            type="button"
            className="rounded-xl bg-stamp px-4 py-2 text-sm font-semibold text-white"
            onClick={() => onStep('seleccion')}
          >
            Ver las páginas
          </button>
        ) : (
          <p className="text-sm text-muted">Prepara el PDF cuando la posición y el inicio estén listos. El original no cambia.</p>
        )}
      </section>
    )
  }

  if (step === 'seleccion') {
    return (
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StepBack label="Inicio" onClick={() => onStep('config')} />
          <button
            type="button"
            className="rounded-xl bg-stamp px-4 py-2 text-sm font-semibold text-white"
            onClick={() => onStep('insercion')}
          >
            Acomodar el número
          </button>
        </div>
        <p className="text-sm text-muted">
          Toca una página para quitar el número. Esa página igual cuenta en la serie.
        </p>
        <ol
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}px, 1fr))` }}
        >
          {pages.map((page, index) => {
            const mark = marks[index]
            const before = mark?.consumed == null
            const hiddenPage = !before && mark?.shown == null
            return (
              <li key={page.id}>
                <button
                  type="button"
                  disabled={before}
                  aria-pressed={!before && !hiddenPage}
                  className={`w-full rounded-2xl border bg-card p-2 text-left ${
                    before
                      ? 'border-line opacity-50'
                      : hiddenPage
                        ? 'border-dashed border-line'
                        : 'border-stamp ring-2 ring-stamp'
                  }`}
                  onClick={() => onToggle(page.id)}
                >
                  <span className="relative block aspect-[3/4] overflow-hidden rounded-xl bg-[#f4efe6]">
                    {thumbs[index] ? (
                      <img src={thumbs[index]} alt="" className="h-full w-full object-contain" draggable={false} />
                    ) : (
                      <span className="block h-full w-full animate-pulse bg-[#efe6da]" />
                    )}
                    <span className="absolute top-2 left-2 rounded-md bg-[#211c18]/90 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                      pág. {index + 1}
                    </span>
                  </span>
                  <span className="mt-2 block text-center text-sm text-muted">
                    {before
                      ? 'Antes del inicio'
                      : hiddenPage
                        ? `Sin número · cuenta ${mark?.consumed}`
                        : `Número ${mark?.shown}`}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </section>
    )
  }

  if (step === 'insercion') {
    const sideNote =
      zone === 'interno' || zone === 'externo'
        ? edgeSide(zone, shownIndex) === 'right'
          ? 'En esta página el número queda a la derecha.'
          : 'En esta página el número queda a la izquierda.'
        : zone === 'cabecera'
          ? 'Muévelo de izquierda a derecha en la cabecera.'
          : 'Muévelo de izquierda a derecha en el pie.'
    return (
      <section className="mx-auto flex max-w-3xl flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StepBack label="Páginas" onClick={() => onStep('seleccion')} />
          <button
            type="button"
            className="rounded-xl bg-stamp px-4 py-2 text-sm font-semibold text-white"
            onClick={() => onStep('previa')}
          >
            Ver todas las páginas
          </button>
        </div>
        <header>
          <h2 className="font-display text-2xl">Inserción</h2>
          <p className="mt-1 text-sm text-muted">{sideNote} {face}. El original no cambia.</p>
        </header>
        <div className="flex flex-wrap gap-2">
          {zones.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={zone === item.id}
              className={`rounded-xl border px-3 py-2 text-sm ${
                zone === item.id ? 'border-stamp bg-stamp text-white' : 'border-line bg-raise text-ink hover:bg-well'
              }`}
              onClick={() => onZone(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-ink">
            Tipografía
            <select
              aria-label="Tipografía"
              value={face}
              className="rounded-lg border border-line bg-raise px-2 py-1"
              style={{ fontFamily: faceCss(face) }}
              onChange={(event) => {
                const next = NUMBER_FACES.find((item) => item === event.target.value)
                if (next) onFace(next)
              }}
            >
              {NUMBER_FACES.map((item) => (
                <option key={item} value={item} style={{ fontFamily: faceCss(item) }}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            Tamaño
            <input
              type="number"
              min={8}
              max={72}
              value={size}
              className="w-16 rounded-lg border border-line bg-raise px-2 py-1"
              onChange={(event) => onSize(clampInt(event.target.value, 8, 72, NUMBER_SIZE))}
            />
          </label>
        </div>
        {opposite >= 0 ? (
          <div className="flex gap-2">
            <button
              type="button"
              aria-pressed={!facing}
              className={`rounded-lg border px-3 py-1.5 text-sm ${facing ? 'border-line bg-raise' : 'border-stamp bg-stamp text-white'}`}
              onClick={() => setFacing(false)}
            >
              Esta página
            </button>
            <button
              type="button"
              aria-pressed={facing}
              className={`rounded-lg border px-3 py-1.5 text-sm ${facing ? 'border-stamp bg-stamp text-white' : 'border-line bg-raise'}`}
              onClick={() => setFacing(true)}
            >
              La de enfrente
            </button>
          </div>
        ) : null}
        <SheetBoard
          thumb={thumbs[shownIndex] ?? ''}
          zone={zone}
          align={align}
          pageIndex={shownIndex}
          label={String(marks[shownIndex]?.consumed ?? startAt)}
          size={size}
          face={face}
          onAlign={onAlign}
          onZone={onZone}
        />
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StepBack label="Inserción" onClick={() => onStep('insercion')} />
        <p className="text-sm text-muted">Así queda la copia. El original no se modifica.</p>
      </div>
      <ol
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}px, 1fr))` }}
      >
        {pages.map((page, index) => {
          const mark = marks[index]
          return (
            <li key={page.id} className="rounded-2xl border border-line bg-card p-2">
              <span className="relative block aspect-[3/4] overflow-hidden rounded-xl bg-[#f4efe6]">
                {thumbs[index] ? (
                  <img src={thumbs[index]} alt="" className="h-full w-full object-contain" draggable={false} />
                ) : (
                  <span className="block h-full w-full animate-pulse bg-[#efe6da]" />
                )}
                {mark?.shown != null ? (
                  <span
                    className="absolute rounded-sm bg-[#f7f4ee] px-1 leading-none font-medium text-[#211c18]"
                    style={{ ...previewAnchor(zone, align, index), fontFamily: faceCss(face), fontSize: 13 }}
                  >
                    {mark.shown}
                  </span>
                ) : null}
              </span>
              <span className="mt-2 block text-center text-sm text-muted">
                {mark?.shown != null ? `Número ${mark.shown}` : mark?.consumed != null ? 'Sin número' : 'Sin numerar'}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function SheetBoard({
  thumb,
  zone,
  align,
  pageIndex,
  label,
  size,
  face,
  onAlign,
  onZone,
}: {
  thumb: string
  zone: NumberZone
  align: number
  pageIndex: number
  label: string
  size: number
  face: NumberFace
  onAlign: (value: number) => void
  onZone: (zone: NumberZone) => void
}) {
  const bandRef = useRef<HTMLDivElement>(null)
  const horizontal = zone === 'cabecera' || zone === 'pie'
  const side = zone === 'interno' || zone === 'externo' ? edgeSide(zone, pageIndex) : null

  function move(clientX: number, clientY: number) {
    const band = bandRef.current
    if (!band) return
    const rect = band.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) return
    const next = horizontal ? (clientX - rect.left) / rect.width : (clientY - rect.top) / rect.height
    onAlign(Math.min(1, Math.max(0, next)))
  }

  const bandClass =
    zone === 'cabecera'
      ? 'top-0 right-0 left-0 h-[12%]'
      : zone === 'pie'
        ? 'right-0 bottom-0 left-0 h-[12%]'
        : side === 'left'
          ? 'top-0 bottom-0 left-0 w-[12%]'
          : 'top-0 right-0 bottom-0 w-[12%]'

  return (
    <div className="grid place-items-center rounded-3xl bg-well px-6 py-8">
      <div className="relative aspect-[3/4] w-full max-w-[420px] overflow-hidden rounded-sm bg-[#f7f4ee] shadow-[0_16px_40px_rgba(40,28,16,0.16)]">
        {thumb ? <img src={thumb} alt="" className="h-full w-full object-contain" draggable={false} /> : null}
        <ZoneGuide label="Cabecera" className="top-0 right-0 left-0 h-[12%]" active={zone === 'cabecera'} onPick={() => onZone('cabecera')} />
        <ZoneGuide label="Pie" className="right-0 bottom-0 left-0 h-[12%]" active={zone === 'pie'} onPick={() => onZone('pie')} />
        <ZoneGuide
          label={sideLabel('left', zone, pageIndex)}
          className="top-0 bottom-0 left-0 w-[12%]"
          active={side === 'left'}
          onPick={() => onZone(zoneOnSide('left', pageIndex))}
        />
        <ZoneGuide
          label={sideLabel('right', zone, pageIndex)}
          className="top-0 right-0 bottom-0 w-[12%]"
          active={side === 'right'}
          onPick={() => onZone(zoneOnSide('right', pageIndex))}
        />
        <div ref={bandRef} className={`absolute ${bandClass}`}>
          <button
            type="button"
            className="absolute cursor-grab touch-none rounded-sm bg-[#f7f4ee] px-1.5 leading-none font-medium text-[#211c18] active:cursor-grabbing"
            style={{
              left: horizontal ? `${align * 100}%` : '50%',
              top: horizontal ? '50%' : `${align * 100}%`,
              transform: 'translate(-50%, -50%)',
              fontFamily: faceCss(face),
              fontSize: Math.max(16, size),
            }}
            aria-label={`Número ${label}. Arrástralo dentro de la zona.`}
            onPointerDown={(event) => {
              event.preventDefault()
              event.currentTarget.setPointerCapture(event.pointerId)
              move(event.clientX, event.clientY)
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
              move(event.clientX, event.clientY)
            }}
          >
            {label}
          </button>
        </div>
      </div>
    </div>
  )
}

function ZoneGuide({
  label,
  className,
  active,
  onPick,
}: {
  label: string
  className: string
  active: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`absolute border border-dashed ${className} ${active ? 'border-stamp bg-stamp/10' : 'border-[#c8bba8]'}`}
      onClick={onPick}
    />
  )
}

function sideLabel(side: 'left' | 'right', zone: NumberZone, pageIndex: number) {
  if (zone !== 'interno' && zone !== 'externo') {
    return side === 'left' ? 'Borde izquierdo' : 'Borde derecho'
  }
  const here = edgeSide(zone, pageIndex)
  if (here === side) return zone === 'interno' ? 'Borde interno' : 'Borde externo'
  return zone === 'interno' ? 'Borde externo' : 'Borde interno'
}

function zoneOnSide(side: 'left' | 'right', pageIndex: number): NumberZone {
  const internoLeft = edgeSide('interno', pageIndex) === 'left'
  if (side === 'left') return internoLeft ? 'interno' : 'externo'
  return internoLeft ? 'externo' : 'interno'
}

function ModeCard({ title, text, onClick }: { title: string; text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="rounded-3xl border border-line bg-card p-6 text-left hover:border-stamp"
      onClick={onClick}
    >
      <span className="font-display text-2xl">{title}</span>
      <span className="mt-2 block text-sm text-muted">{text}</span>
    </button>
  )
}

function StepBack({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="text-sm text-muted underline" onClick={onClick}>
      {label}
    </button>
  )
}

function Field({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <label className="block text-sm text-ink">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        className="mt-1 w-full rounded-xl border border-line bg-raise px-3 py-2"
        onChange={(event) => onChange(clampInt(event.target.value, min, max, min))}
      />
    </label>
  )
}

function clampInt(text: string, min: number, max: number, fallback: number) {
  const value = Math.floor(Number(text))
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}
