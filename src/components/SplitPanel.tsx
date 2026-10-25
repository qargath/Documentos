import type { PartSummary } from '../split'

export function SplitPanel({
  pageCount,
  parts,
  canClear,
  onClear,
}: {
  pageCount: number
  parts: PartSummary[]
  canClear: boolean
  onClear: () => void
}) {
  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col">
      <div className="mb-2.5 flex shrink-0 items-center justify-between gap-3">
        <h2 className="text-[11px] font-semibold tracking-[0.12em] text-gold uppercase">
          Archivos{parts.length > 0 ? ` (${parts.length})` : ''}
        </h2>
        {canClear ? (
          <button type="button" className="text-[11px] font-medium text-stamp underline" onClick={onClear}>
            Quitar cortes
          </button>
        ) : null}
      </div>
      <p className="shrink-0 text-sm text-muted">Toca el riel para cortar. Toca la cuchilla para quitar ese corte.</p>

      {pageCount === 0 ? (
        <p className="mt-3 text-sm text-muted">El reparto se muestra al abrir un PDF.</p>
      ) : (
        <ol className="mt-3 flex min-h-0 flex-1 flex-col content-start gap-1.5 overflow-y-auto rounded-xl border border-line bg-raise p-2" aria-label="Archivos resultantes">
          {parts.map((part) => (
            <li key={part.title} className="rounded-lg border border-line bg-card px-3 py-2">
              <p className="text-sm font-medium text-ink">{part.title}</p>
              <p className="text-xs text-muted">{part.detail}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
