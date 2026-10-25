import { actionIcons, Icon } from './icons'

export function MergePanel({
  files,
  onShift,
  onRemove,
}: {
  files: { id: string; name: string; pageCount: number }[]
  onShift: (id: string, toward: 'before' | 'after') => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col">
      <div className="mb-2.5 flex shrink-0 items-center justify-between gap-3">
        <h3 className="text-[11px] font-semibold tracking-[0.12em] text-gold uppercase">
          Archivos{files.length > 0 ? ` (${files.length})` : ''}
        </h3>
      </div>
      {files.length === 0 ? (
        <p className="text-sm text-muted">Suelta varios PDF en el centro o impórtalos.</p>
      ) : (
        <ol className="flex min-h-0 flex-1 flex-col content-start gap-1.5 overflow-y-auto rounded-xl border border-line bg-raise p-2" aria-label="Archivos por unir">
          {files.map((file, index) => (
            <li key={file.id} className="flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${mergeTone(index)}`} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{file.name}</span>
                <span className="block text-xs text-muted">
                  {file.pageCount} {file.pageCount === 1 ? 'página' : 'páginas'}
                </span>
              </span>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-lg text-quiet hover:bg-well hover:text-ink disabled:opacity-30"
                aria-label="Mover este archivo antes"
                disabled={index === 0}
                onClick={() => onShift(file.id, 'before')}
              >
                <Icon svg={actionIcons.antes} className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-lg text-quiet hover:bg-well hover:text-ink disabled:opacity-30"
                aria-label="Mover este archivo después"
                disabled={index === files.length - 1}
                onClick={() => onShift(file.id, 'after')}
              >
                <Icon svg={actionIcons.despues} className="h-4 w-4" />
              </button>
              <button type="button" className="text-[11px] font-medium text-stamp underline" onClick={() => onRemove(file.id)}>
                Quitar
              </button>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-2.5 shrink-0 text-center text-[11px] text-quiet">
        En Ordenar páginas ves las hojas de estos archivos, en este orden.
      </p>
    </div>
  )
}

export function mergeTone(index: number) {
  const tones = ['bg-[#c4512c]', 'bg-[#1c6b50]', 'bg-[#2a5c94]', 'bg-[#62407a]', 'bg-[#8a6232]', 'bg-[#211c18]']
  return tones[index % tones.length]
}
