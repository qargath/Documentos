import { Icon, toolIcons } from './icons'
import type { PageItem } from '../state'

export function SplitGrid({
  pages,
  thumbs,
  cardWidth,
  parts,
  cutting,
  onToggleCut,
}: {
  pages: PageItem[]
  thumbs: string[]
  cardWidth: number
  parts: PageItem[][]
  cutting: boolean
  onToggleCut: (id: string) => void
}) {
  const partNumber = new Map<string, number>()
  const boundary = new Set<string>()
  parts.forEach((part, index) => {
    for (const page of part) partNumber.set(page.id, index + 1)
    const edge = part.at(-1)
    if (edge && index < parts.length - 1) boundary.add(edge.id)
  })
  const lastId = pages.at(-1)?.id

  return (
    <ol className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}px, 1fr))` }}>
      {pages.map((page, index) => {
        const part = partNumber.get(page.id) ?? 1
        const cut = boundary.has(page.id)
        const terminal = page.id === lastId
        const label = `Página ${page.sourceIndex + 1}, lugar ${index + 1}, parte ${part}. ${
          terminal ? 'Es la última página.' : cut ? 'Hay un corte después de esta página.' : 'Sin corte después.'
        }`
        const face = (
          <SheetFace
            pageNumber={page.sourceIndex + 1}
            place={index + 1}
            part={part}
            thumb={thumbs[index] ?? ''}
            cut={cut}
          />
        )
        return (
          <li key={page.id} data-id={page.id} data-page={page.sourceIndex + 1} data-place={index + 1}>
            {cutting ? (
              <button
                type="button"
                className="w-full rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stamp"
                aria-label={label}
                aria-pressed={cut}
                onClick={() => onToggleCut(page.id)}
              >
                {face}
              </button>
            ) : (
              <div aria-label={label}>{face}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function SheetFace({
  pageNumber,
  place,
  part,
  thumb,
  cut,
}: {
  pageNumber: number
  place: number
  part: number
  thumb: string
  cut: boolean
}) {
  return (
    <div
      className={`rounded-2xl border bg-card p-2 shadow-[0_10px_30px_rgba(60,40,20,0.05)] ${
        cut ? 'border-stamp ring-2 ring-stamp' : 'border-line'
      }`}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-[#f4efe6]">
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-contain" draggable={false} />
        ) : (
          <div className="h-full w-full animate-pulse bg-[#efe6da]" />
        )}
        <span className="absolute top-2 left-2 rounded-md bg-ink/90 px-1.5 py-0.5 text-[11px] font-semibold text-white">
          pág. {pageNumber}
        </span>
        <span
          className={`absolute bottom-2 left-2 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-white ${partTone(part)}`}
        >
          Parte {part}
        </span>
        {cut ? (
          <span className="absolute top-2 right-2 grid h-6 w-6 place-items-center rounded-full bg-stamp text-white">
            <Icon svg={toolIcons.dividir} className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-center text-sm text-muted">Lugar {place}</p>
    </div>
  )
}

function partTone(part: number) {
  const tones = ['bg-stamp', 'bg-moss', 'bg-[#2a5c94]', 'bg-[#62407a]', 'bg-[#8a6232]', 'bg-ink']
  return tones[(part - 1) % tones.length]
}
