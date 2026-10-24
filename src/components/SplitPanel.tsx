import type { SplitMode, PartSummary } from '../split'

export function SplitPanel({
  pageCount,
  mode,
  every,
  parts,
  canClear,
  onMode,
  onEvery,
  onClear,
}: {
  pageCount: number
  mode: SplitMode
  every: number
  parts: PartSummary[]
  canClear: boolean
  onMode: (mode: SplitMode) => void
  onEvery: (value: number) => void
  onClear: () => void
}) {
  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col">
      <h2 className="shrink-0 text-[11px] font-semibold tracking-[0.12em] text-[#b38b4d] uppercase">Cómo dividir</h2>
      <div className="mt-2 grid shrink-0 grid-cols-3 gap-1 rounded-xl border border-line bg-[#faf7f2] p-1" role="radiogroup" aria-label="Forma de dividir">
        <ModeButton active={mode === 'cortes'} label="Cortes" onClick={() => onMode('cortes')} />
        <ModeButton active={mode === 'intervalo'} label="Cada N" onClick={() => onMode('intervalo')} />
        <ModeButton active={mode === 'hojas'} label="Cada hoja" onClick={() => onMode('hojas')} />
      </div>

      {mode === 'cortes' ? (
        <p className="mt-3 shrink-0 text-sm text-muted">
          Toca una página para cortar después de ella. El recuadro del centro marca varias.
        </p>
      ) : null}
      {mode === 'intervalo' ? (
        <label className="mt-3 flex shrink-0 items-center gap-2 text-sm text-ink">
          Cada
          <input
            type="number"
            min={1}
            max={Math.max(pageCount, 1)}
            value={every}
            aria-label="Páginas por archivo"
            className="w-16 rounded-lg border border-line bg-white px-2 py-1 text-center"
            onChange={(event) => {
              const value = Number(event.target.value)
              if (!Number.isInteger(value)) return
              onEvery(Math.min(Math.max(value, 1), Math.max(pageCount, 1)))
            }}
          />
          {every === 1 ? 'página' : 'páginas'}
        </label>
      ) : null}
      {mode === 'hojas' ? (
        <p className="mt-3 shrink-0 text-sm text-muted">Cada página del orden actual sale en su propio PDF.</p>
      ) : null}

      <div className="mt-4 mb-2.5 flex shrink-0 items-center justify-between gap-3">
        <h3 className="text-[11px] font-semibold tracking-[0.12em] text-[#b38b4d] uppercase">
          Archivos{parts.length > 0 ? ` (${parts.length})` : ''}
        </h3>
        {canClear ? (
          <button type="button" className="text-[11px] font-medium text-stamp underline" onClick={onClear}>
            Quitar cortes
          </button>
        ) : null}
      </div>

      {pageCount === 0 ? (
        <p className="text-sm text-muted">El reparto se muestra al abrir un PDF.</p>
      ) : (
        <ol className="flex min-h-0 flex-1 flex-col content-start gap-1.5 overflow-y-auto rounded-xl border border-line bg-white p-2" aria-label="Archivos resultantes">
          {parts.map((part) => (
            <li key={part.title} className="rounded-lg border border-[#e0d9cd] bg-white px-3 py-2">
              <p className="text-sm font-medium text-ink">{part.title}</p>
              <p className="text-xs text-muted">{part.detail}</p>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-2.5 shrink-0 text-center text-[11px] text-[#a69f95]">Se divide el orden que ves ahora</p>
    </div>
  )
}

function ModeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      className={`rounded-lg px-2 py-1.5 text-[13px] ${
        active ? 'bg-white font-semibold text-stamp shadow-sm' : 'font-medium text-muted hover:text-ink'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
