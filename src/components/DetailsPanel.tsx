import { useEffect, useRef, useState } from 'react'
import type { PartSummary, SplitMode } from '../split'
import type { HistoryStep, PageItem } from '../state'
import { actionIcons, atajosIcon, Icon, originalIcon, toolIcons } from './icons'
import { MergePanel } from './MergePanel'
import { SplitPanel } from './SplitPanel'
import { toolById, type ToolId } from './Sidebar'

type PanelTab = 'paginas' | 'historial' | 'atajos'

interface DetailsPanelProps {
  tool: ToolId
  fileName: string | null
  pageCount: number
  byteLength: number
  status: string
  error: string | null
  thumbError: string | null
  changed: boolean
  pages: PageItem[]
  selectedIds: string[]
  steps: HistoryStep[]
  index: number
  canMoveEarlier: boolean
  canMoveLater: boolean
  canUndo: boolean
  canRedo: boolean
  canPrepare: boolean
  canDownload: boolean
  preparing: boolean
  prepareLabel: string
  downloadLabel: string
  restoreLabel: string
  mergeFiles: { id: string; name: string; pageCount: number }[]
  onShiftMergeFile: (id: string, toward: 'before' | 'after') => void
  onRemoveMergeFile: (id: string) => void
  splitMode: SplitMode
  splitEvery: number
  splitParts: PartSummary[]
  canClearCuts: boolean
  onSplitMode: (mode: SplitMode) => void
  onSplitEvery: (value: number) => void
  onClearCuts: () => void
  onPick: () => void
  onMoveStart: () => void
  onMoveBefore: () => void
  onMoveAfter: () => void
  onMoveEnd: () => void
  onUndo: () => void
  onRedo: () => void
  onRestore: () => void
  onGoto: (index: number) => void
  onPrepare: () => void
  onDownload: () => void
}

export function DetailsPanel(props: DetailsPanelProps) {
  const current = toolById(props.tool)
  const selected = new Set(props.selectedIds)
  const [tab, setTab] = useState<PanelTab>('paginas')
  const currentStep = useRef<HTMLButtonElement>(null)
  const changes = Math.max(0, props.steps.length - 1)

  useEffect(() => {
    currentStep.current?.scrollIntoView({ block: 'nearest' })
  }, [props.index, props.steps.length, tab])

  return (
    <aside className="flex h-full min-h-0 w-[360px] shrink-0 flex-col overflow-hidden border-l border-line bg-card/80 px-4 py-5">
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0 pt-0.5">
          {props.fileName ? (
            <>
              <p className="truncate font-display text-xl leading-tight">{fileTitle(props.fileName)}</p>
              <p className="mt-0.5 text-xs text-muted">
                {props.pageCount} {props.pageCount === 1 ? 'página' : 'páginas'} · {formatBytes(props.byteLength)}
              </p>
            </>
          ) : (
            <p className="text-sm leading-snug text-muted">Todavía no hay un PDF abierto.</p>
          )}
        </div>
        <div className="shrink-0">
          <h2 className="text-[11px] font-semibold tracking-[0.12em] text-[#b38b4d] uppercase">Archivo y flujo</h2>
          <div className="mt-1.5 inline-flex items-center gap-0.5 rounded-xl border-[1.5px] border-line bg-[#faf7f2] px-1.5 py-1">
        <IconButton label="Importar" svg={actionIcons.importar} disabled={false} tip="below" onClick={props.onPick} />
        <IconButton
          label={props.preparing ? 'Armando…' : props.prepareLabel}
          svg={actionIcons.preparar}
          disabled={!props.canPrepare}
          tone={props.canPrepare || props.preparing ? 'stamp' : 'default'}
          tip="below"
          onClick={props.onPrepare}
        />
        <IconButton
          label={props.downloadLabel}
          svg={actionIcons.descargar}
          disabled={!props.canDownload}
          tone={props.canDownload ? 'ready' : 'default'}
          tip="below"
          onClick={props.onDownload}
        />
          </div>
        </div>
      </div>
      {props.status ? (
        <p className="mt-3 text-sm text-muted" aria-live="polite">
          {props.status}
        </p>
      ) : null}
      {props.error ? <p className="mt-2 text-sm font-medium text-stamp">{props.error}</p> : null}
      {props.thumbError ? <p className="mt-2 text-sm text-muted">{props.thumbError}</p> : null}

      {props.tool === 'dividir' ? (
        <SplitPanel
          pageCount={props.pageCount}
          mode={props.splitMode}
          every={props.splitEvery}
          parts={props.splitParts}
          canClear={props.canClearCuts}
          onMode={props.onSplitMode}
          onEvery={props.onSplitEvery}
          onClear={props.onClearCuts}
        />
      ) : props.tool === 'unir' ? (
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <section className="shrink-0">
            <h2 className="text-[11px] font-semibold tracking-[0.12em] text-[#b38b4d] uppercase">Acciones</h2>
            <div className="mt-2 flex items-center justify-between rounded-xl border-[1.5px] border-line bg-[#faf7f2] px-1.5 py-1">
              <IconButton label="Al inicio" svg={actionIcons.alInicio} disabled={!props.canMoveEarlier} onClick={props.onMoveStart} />
              <IconButton label="Antes" svg={actionIcons.antes} disabled={!props.canMoveEarlier} onClick={props.onMoveBefore} />
              <IconButton label="Después" svg={actionIcons.despues} disabled={!props.canMoveLater} onClick={props.onMoveAfter} />
              <IconButton label="Al final" svg={actionIcons.alFinal} disabled={!props.canMoveLater} onClick={props.onMoveEnd} />
              <span className="mx-0.5 h-5 w-px shrink-0 bg-line" aria-hidden="true" />
              <IconButton label="Deshacer (Ctrl+Z)" svg={actionIcons.deshacer} disabled={!props.canUndo} onClick={props.onUndo} />
              <IconButton
                label="Rehacer (Ctrl+Mayús+Z)"
                svg={actionIcons.rehacer}
                disabled={!props.canRedo}
                align="end"
                onClick={props.onRedo}
              />
              <span className="mx-0.5 h-5 w-px shrink-0 bg-line" aria-hidden="true" />
              <IconButton
                label={props.restoreLabel}
                svg={actionIcons.restaurar}
                disabled={!props.changed}
                align="end"
                onClick={props.onRestore}
              />
            </div>
          </section>
          <MergePanel files={props.mergeFiles} onShift={props.onShiftMergeFile} onRemove={props.onRemoveMergeFile} />
        </div>
      ) : current.ready ? (
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <section className="shrink-0">
            <h2 className="text-[11px] font-semibold tracking-[0.12em] text-[#b38b4d] uppercase">Acciones</h2>
            <div className="mt-2 flex items-center justify-between rounded-xl border-[1.5px] border-line bg-[#faf7f2] px-1.5 py-1">
              <IconButton label="Al inicio" svg={actionIcons.alInicio} disabled={!props.canMoveEarlier} onClick={props.onMoveStart} />
              <IconButton label="Antes" svg={actionIcons.antes} disabled={!props.canMoveEarlier} onClick={props.onMoveBefore} />
              <IconButton label="Después" svg={actionIcons.despues} disabled={!props.canMoveLater} onClick={props.onMoveAfter} />
              <IconButton label="Al final" svg={actionIcons.alFinal} disabled={!props.canMoveLater} onClick={props.onMoveEnd} />
              <span className="mx-0.5 h-5 w-px shrink-0 bg-line" aria-hidden="true" />
              <IconButton label="Deshacer (Ctrl+Z)" svg={actionIcons.deshacer} disabled={!props.canUndo} onClick={props.onUndo} />
              <IconButton
                label="Rehacer (Ctrl+Mayús+Z)"
                svg={actionIcons.rehacer}
                disabled={!props.canRedo}
                align="end"
                onClick={props.onRedo}
              />
              <span className="mx-0.5 h-5 w-px shrink-0 bg-line" aria-hidden="true" />
              <IconButton
                label={props.restoreLabel}
                svg={actionIcons.restaurar}
                disabled={!props.changed}
                align="end"
                onClick={props.onRestore}
              />
            </div>
          </section>

          <div className="mt-4 flex shrink-0 gap-3 border-b-[1.5px] border-line" role="tablist" aria-label="Panel">
            <TabButton
              active={tab === 'paginas'}
              label="Páginas"
              svg={toolIcons.ordenar}
              onClick={() => setTab('paginas')}
            />
            <TabButton
              active={tab === 'historial'}
              label="Historial"
              svg={actionIcons.historial}
              badge={changes > 0 ? String(changes) : undefined}
              onClick={() => setTab('historial')}
            />
            <TabButton active={tab === 'atajos'} label="Atajos" svg={atajosIcon} onClick={() => setTab('atajos')} />
          </div>

          {tab === 'paginas' ? (
            <div className="mt-3 flex min-h-0 flex-1 flex-col" role="tabpanel">
              <div className="mb-2.5 flex shrink-0 items-center justify-between gap-3">
                <h3 className="text-[11px] font-semibold tracking-[0.12em] text-[#b38b4d] uppercase">
                  Nuevo orden{props.pageCount > 0 ? ` (${props.pageCount} págs.)` : ''}
                </h3>
                {props.changed ? (
                  <span className="rounded-md bg-[#e6f4ea] px-1.5 py-0.5 text-[10px] font-bold text-[#137333]">
                    Modificado
                  </span>
                ) : null}
              </div>
              {props.pages.length === 0 ? (
                <p className="text-sm text-muted">El orden se muestra al abrir un PDF.</p>
              ) : (
                <ol
                  className="grid min-h-0 flex-1 content-start grid-cols-7 gap-[5px] overflow-y-auto rounded-xl border border-line bg-white px-2 py-2.5"
                  aria-label="Nuevo orden del archivo"
                >
                  {props.pages.map((page) => (
                    <li
                      key={page.id}
                      className={`grid h-8 place-items-center rounded-[7px] border text-[11px] font-medium ${
                        selected.has(page.id)
                          ? 'border-stamp bg-stamp font-bold text-white shadow-[0_2px_6px_rgba(194,81,39,0.3)]'
                          : 'border-[#e0d9cd] bg-white text-[#4a453e]'
                      }`}
                    >
                      {page.sourceIndex + 1}
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-2.5 shrink-0 text-center text-[11px] text-[#a69f95]">
                Lectura: de izquierda a derecha y arriba hacia abajo
              </p>
            </div>
          ) : null}

          {tab === 'historial' ? (
            <div className="mt-3 flex min-h-0 flex-1 flex-col" role="tabpanel">
              {props.steps.length === 0 ? (
                <p className="text-sm text-muted">El historial aparece al abrir un PDF.</p>
              ) : (
                <ol
                  className="flex min-h-0 flex-1 flex-col content-start gap-1.5 overflow-y-auto rounded-xl border-[1.5px] border-line bg-white p-2"
                  aria-label="Historial del archivo"
                >
                  {props.steps.map((step, stepIndex) => {
                    const here = stepIndex === props.index
                    const later = stepIndex > props.index
                    return (
                      <li key={`${stepIndex}-${step.label}`}>
                        <button
                          type="button"
                          ref={here ? currentStep : undefined}
                          aria-current={here ? 'step' : undefined}
                          className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-[12.5px] ${
                            here
                              ? 'border-stamp bg-white font-semibold text-stamp shadow-[0_2px_8px_rgba(194,81,39,0.1)]'
                              : later
                                ? 'border-transparent text-muted hover:bg-[#faf7f2]'
                                : 'border-transparent text-[#5a544e] hover:bg-[#faf7f2] hover:text-ink'
                          }`}
                          onClick={() => props.onGoto(stepIndex)}
                        >
                          <span className="flex min-w-0 items-center">
                            {here ? (
                              <span className="mr-1.5 text-[9px]" aria-hidden="true">
                                ▶
                              </span>
                            ) : null}
                            {stepIndex === 0 && step.at == null ? (
                              <Icon svg={originalIcon} className="mr-2 h-3.5 w-3.5 text-[#9c958c]" />
                            ) : null}
                            <span className="truncate">{step.label}</span>
                          </span>
                          <span className="shrink-0 font-mono text-[10px] text-[#9c958c]">{stepClock(step)}</span>
                        </button>
                      </li>
                    )
                  })}
                </ol>
              )}
              <div className="mt-2.5 flex shrink-0 items-center justify-between px-1 text-[11px] text-muted">
                <span>Haz clic en un paso para viajar en el tiempo</span>
                <button type="button" className="font-medium text-stamp underline" onClick={() => setTab('paginas')}>
                  Ver orden
                </button>
              </div>
            </div>
          ) : null}

          {tab === 'atajos' ? (
            <div className="mt-3 min-h-0 flex-1 space-y-3.5 overflow-y-auto pr-1 text-xs text-[#403b35]" role="tabpanel">
              <p className="rounded-[10px] border border-[#ebd9b8] bg-[#fbf7ee] px-3 py-2.5 text-[11px] leading-snug text-[#7a5e2c]">
                {props.pageCount > 1 ? `${props.pageCount} páginas. ` : ''}
                Arrastra en el vacío para marcar un grupo, o arrastra una página para moverla.
              </p>
              <div>
                <p className="mb-1.5 text-[10px] font-bold tracking-[0.1em] text-[#9c958c] uppercase">Selección de páginas</p>
                <Shortcut keys={['Clic']} text="Seleccionar una página" />
                <Shortcut keys={['Ctrl', 'Clic']} text="Sumar o quitar selección" />
                <Shortcut keys={['Mayús', 'Clic']} text="Marcar un tramo continuo" />
                <Shortcut text="Selección múltiple en recuadro" note="En el centro" />
                <Shortcut text="Deseleccionar todo" note="Clic en el centro" />
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-bold tracking-[0.1em] text-[#9c958c] uppercase">Vista</p>
                <Shortcut keys={['Ctrl', 'Rueda']} text="Tamaño de las hojas, en el centro" />
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-bold tracking-[0.1em] text-[#9c958c] uppercase">Acciones y edición</p>
                <Shortcut keys={['Ctrl', 'Z']} text="Deshacer última acción" />
                <Shortcut keys={['Ctrl', 'Mayús', 'Z']} text="Rehacer acción" />
                <Shortcut text="Restaurar al estado inicial" note="Botón Restaurar" />
              </div>
              <p className="rounded-[10px] border border-[#ebd9b8] bg-[#fbf7ee] px-3 py-2.5 text-[11px] leading-snug text-[#7a5e2c]">
                Realiza los movimientos con las acciones o arrastrando las miniaturas. Cuando el orden sea el deseado,
                presiona Preparar PDF y luego Descargar.
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <section className="mt-8">
          <h2 className="font-display text-2xl">{current.label}</h2>
          <p className="mt-2 text-sm text-muted">Esta función todavía no está disponible.</p>
        </section>
      )}
    </aside>
  )
}

function TabButton({
  active,
  label,
  svg,
  badge,
  onClick,
}: {
  active: boolean
  label: string
  svg: string
  badge?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`relative inline-flex items-center gap-1.5 px-1 py-2 text-[13px] whitespace-nowrap ${
        active ? 'font-semibold text-stamp' : 'font-medium text-muted hover:text-ink'
      }`}
      onClick={onClick}
    >
      <Icon svg={svg} className="h-[17px] w-[17px]" />
      <span>{label}</span>
      {badge ? (
        <span
          className={`rounded-lg px-1.5 py-px text-[10px] font-bold ${
            active ? 'bg-[#faece6] text-stamp' : 'bg-[#eee8de] text-[#6d665e]'
          }`}
        >
          {badge}
        </span>
      ) : null}
      {active ? <span className="absolute inset-x-0 -bottom-[1.5px] h-0.5 rounded-t-sm bg-stamp" /> : null}
    </button>
  )
}

function Shortcut({ text, keys, note }: { text: string; keys?: string[]; note?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-[#eee7dc] py-1.5 last:border-b-0">
      <span className="text-[#555]">{text}</span>
      {keys ? (
        <span className="flex shrink-0 items-center gap-1">
          {keys.map((key, index) => (
            <span key={key} className="flex items-center gap-1">
              {index > 0 ? <span className="text-[10px] text-muted">+</span> : null}
              <kbd className="rounded border border-[#d4cdc3] bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#333] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
                {key}
              </kbd>
            </span>
          ))}
        </span>
      ) : (
        <span className="text-[11px] text-[#888]">{note}</span>
      )}
    </div>
  )
}

function IconButton({
  label,
  svg,
  disabled,
  onClick,
  align = 'center',
  tone = 'default',
  tip = 'above',
}: {
  label: string
  svg: string
  disabled: boolean
  onClick: () => void
  align?: 'center' | 'end'
  tone?: 'default' | 'stamp' | 'ready'
  tip?: 'above' | 'below'
}) {
  const place =
    align === 'end'
      ? 'right-0 translate-x-0'
      : 'left-1/2 -translate-x-1/2'
  const arrow = align === 'end' ? 'right-3' : 'left-1/2 -translate-x-1/2'
  const tipClass =
    tip === 'below'
      ? `top-[calc(100%+7px)] -translate-y-1 group-hover:translate-y-0 group-focus-within:translate-y-0`
      : `bottom-[calc(100%+7px)] translate-y-1 group-hover:translate-y-0 group-focus-within:translate-y-0`
  const arrowClass =
    tip === 'below' ? `bottom-full border-b-ink ${arrow}` : `top-full border-t-ink ${arrow}`
  const toneClass =
    tone === 'stamp'
      ? 'border-stamp bg-stamp text-white shadow-[0_2px_6px_rgba(194,81,39,0.28)] hover:border-stamp hover:bg-stamp-dark hover:text-white'
      : tone === 'ready'
        ? 'border-[#34a853] text-[#137333] hover:border-[#34a853] hover:bg-[#e6f4ea] hover:text-[#137333]'
        : 'text-[#5a544e] hover:border-line hover:bg-white hover:text-ink hover:shadow-sm'
  return (
    <span className="group relative">
      <button
        type="button"
        aria-label={label}
        aria-disabled={disabled || undefined}
        className={`grid h-[34px] w-[34px] place-items-center rounded-lg border border-transparent transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stamp ${toneClass} ${
          disabled ? 'opacity-40' : ''
        }`}
        onClick={() => {
          if (!disabled) onClick()
        }}
      >
        <Icon svg={svg} className="h-[17px] w-[17px]" />
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${tipClass} ${place} z-20 rounded-md bg-ink px-2 py-1 text-[11px] font-medium whitespace-nowrap text-white opacity-0 shadow-[0_3px_10px_rgba(0,0,0,0.2)] transition group-hover:opacity-100 group-focus-within:opacity-100`}
      >
        {label}
        <span className={`absolute border-[5px] border-transparent ${arrowClass}`} />
      </span>
    </span>
  )
}

function stepClock(step: HistoryStep) {
  if (step.at == null) return 'Inicio'
  return new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' }).format(step.at)
}

function fileTitle(name: string) {
  return name.replace(/\.pdf$/i, '')
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) {
    return `${new Intl.NumberFormat('es', { maximumFractionDigits: 0 }).format(bytes / 1024)} KB`
  }
  return `${new Intl.NumberFormat('es', { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024)} MB`
}
