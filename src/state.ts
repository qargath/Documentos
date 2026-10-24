export interface PageItem {
  id: string
  sourceIndex: number
}

export interface HistoryStep {
  label: string
  pages: PageItem[]
  at: number | null
}

export const maxHistoryActions = 100

export interface SorterState {
  file: { name: string; bytes: Uint8Array } | null
  origin: PageItem[]
  pages: PageItem[]
  steps: HistoryStep[]
  index: number
  selectedIds: string[]
  anchorId: string | null
  status: string
  error: string | null
  phase: 'idle' | 'loading' | 'building'
  result: { signature: string; bytes: Uint8Array } | null
}

export const initialState: SorterState = {
  file: null,
  origin: [],
  pages: [],
  steps: [],
  index: 0,
  selectedIds: [],
  anchorId: null,
  status: '',
  error: null,
  phase: 'idle',
  result: null,
}

export type SorterAction =
  | { type: 'start'; phase: 'loading' | 'building' }
  | { type: 'fail'; message: string }
  | { type: 'loaded'; name: string; bytes: Uint8Array; pages: PageItem[] }
  | { type: 'select'; id: string; mode: 'replace' | 'toggle' | 'range' }
  | { type: 'set-selection'; ids: string[]; anchorId: string | null }
  | { type: 'clear-selection' }
  | { type: 'commit'; pages: PageItem[]; status: string; selectedIds?: string[] }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'goto'; index: number }
  | { type: 'restore' }
  | { type: 'result'; signature: string; bytes: Uint8Array }
  | { type: 'idle' }

export function signatureOf(pages: PageItem[]) {
  return pages.map((page) => page.sourceIndex).join('.')
}

export function reducer(state: SorterState, action: SorterAction): SorterState {
  switch (action.type) {
    case 'start':
      return { ...state, phase: action.phase, error: null }
    case 'fail':
      return { ...state, phase: 'idle', error: action.message }
    case 'loaded':
      return {
        ...initialState,
        file: { name: action.name, bytes: action.bytes },
        origin: action.pages,
        pages: action.pages,
        steps: [{ label: 'Orden original', pages: action.pages, at: null }],
        index: 0,
        status: action.pages.length === 1 ? 'Este PDF tiene una sola página. No hay otra posición a la que moverla.' : '',
      }
    case 'select':
      return selectPages(state, action.id, action.mode)
    case 'set-selection':
      return { ...state, selectedIds: action.ids, anchorId: action.anchorId }
    case 'clear-selection':
      return { ...state, selectedIds: [], anchorId: null }
    case 'commit':
      return {
        ...remember(state, action.pages, action.status),
        selectedIds: action.selectedIds ?? state.selectedIds,
      }
    case 'undo':
      return visit(state, state.index - 1)
    case 'redo':
      return visit(state, state.index + 1)
    case 'goto':
      return visit(state, action.index)
    case 'restore': {
      if (signatureOf(state.pages) === signatureOf(state.origin)) return state
      return remember(state, state.origin, 'Restauraste el orden original.')
    }
    case 'result':
      return {
        ...state,
        phase: 'idle',
        result: { signature: action.signature, bytes: action.bytes },
        status: 'El PDF está listo. Revísalo y descárgalo.',
      }
    case 'idle':
      return { ...state, phase: 'idle', error: null }
    default:
      return state
  }
}

function remember(state: SorterState, pages: PageItem[], label: string): SorterState {
  const steps = state.steps.slice(0, state.index + 1)
  steps.push({ label, pages, at: Date.now() })
  const overflow = steps.length - (maxHistoryActions + 1)
  const trimmed = overflow > 0 ? steps.slice(overflow) : steps
  return {
    ...state,
    steps: trimmed,
    index: trimmed.length - 1,
    pages,
    status: label,
    result: null,
  }
}

function visit(state: SorterState, index: number): SorterState {
  const step = state.steps[index]
  if (!step || index === state.index) return state
  return {
    ...state,
    index,
    pages: step.pages,
    status: step.label,
    result: null,
  }
}

function selectPages(state: SorterState, id: string, mode: 'replace' | 'toggle' | 'range'): SorterState {
  if (mode === 'replace') return { ...state, selectedIds: [id], anchorId: id }
  if (mode === 'toggle') {
    const selectedIds = state.selectedIds.includes(id)
      ? state.selectedIds.filter((item) => item !== id)
      : [...state.selectedIds, id]
    return { ...state, selectedIds, anchorId: id }
  }
  const anchor = state.anchorId ?? state.selectedIds[0] ?? id
  const anchorIndex = state.pages.findIndex((page) => page.id === anchor)
  const targetIndex = state.pages.findIndex((page) => page.id === id)
  if (anchorIndex < 0 || targetIndex < 0) return { ...state, selectedIds: [id], anchorId: id }
  const start = Math.min(anchorIndex, targetIndex)
  const end = Math.max(anchorIndex, targetIndex)
  return {
    ...state,
    selectedIds: state.pages.slice(start, end + 1).map((page) => page.id),
    anchorId: anchor,
  }
}
