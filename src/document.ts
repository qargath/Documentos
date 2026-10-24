import { groupedPages, sameMergePages } from './merge'
import { maxHistoryActions } from './state'

export interface DocFile {
  id: string
  name: string
  bytes: Uint8Array
}

export interface DocPage {
  id: string
  fileId: string
  sourceIndex: number
}

export interface DocStep {
  label: string
  files: DocFile[]
  pages: DocPage[]
  at: number | null
}

export interface DocState {
  files: DocFile[]
  pages: DocPage[]
  steps: DocStep[]
  index: number
  selectedIds: string[]
  anchorId: string | null
  status: string
  error: string | null
  phase: 'idle' | 'loading' | 'building'
  result: { signature: string; bytes: Uint8Array } | null
}

export const initialDoc: DocState = {
  files: [],
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

export type DocAction =
  | { type: 'start'; phase: 'loading' | 'building' }
  | { type: 'fail'; message: string }
  | { type: 'idle' }
  | { type: 'load'; files: DocFile[]; pages: DocPage[]; status?: string }
  | { type: 'add'; files: DocFile[]; pages: DocPage[]; label: string }
  | {
      type: 'commit'
      files: DocFile[]
      pages: DocPage[]
      label: string
      selectedIds?: string[]
      result?: { signature: string; bytes: Uint8Array } | null
    }
  | { type: 'select'; id: string; mode: 'replace' | 'toggle' | 'range' }
  | { type: 'set-selection'; ids: string[]; anchorId: string | null }
  | { type: 'clear-selection' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'goto'; index: number }
  | { type: 'restore' }
  | { type: 'result'; signature: string; bytes: Uint8Array; status: string }

export function docSignature(pages: { fileId: string; sourceIndex: number }[]) {
  return pages.map((page) => `${page.fileId}:${page.sourceIndex}`).join('|')
}

export function docReducer(state: DocState, action: DocAction): DocState {
  switch (action.type) {
    case 'start':
      return { ...state, phase: action.phase, error: null }
    case 'fail':
      return { ...state, phase: 'idle', error: action.message }
    case 'idle':
      return { ...state, phase: 'idle', error: null }
    case 'load':
      return {
        ...initialDoc,
        files: action.files,
        pages: action.pages,
        steps: [{ label: 'Orden original', files: action.files, pages: action.pages, at: null }],
        status: action.status ?? '',
      }
    case 'add':
      return remember(state, [...state.files, ...action.files], [...state.pages, ...action.pages], action.label)
    case 'commit':
      return {
        ...remember(state, action.files, action.pages, action.label),
        selectedIds: (action.selectedIds ?? state.selectedIds).filter((id) => action.pages.some((page) => page.id === id) || action.files.some((file) => file.id === id)),
        result: action.result === undefined ? null : action.result,
      }
    case 'select':
      return selectDoc(state, action.id, action.mode)
    case 'set-selection':
      return { ...state, selectedIds: action.ids, anchorId: action.anchorId }
    case 'clear-selection':
      return { ...state, selectedIds: [], anchorId: null }
    case 'undo':
      return visit(state, state.index - 1)
    case 'redo':
      return visit(state, state.index + 1)
    case 'goto':
      return visit(state, action.index)
    case 'restore': {
      const pages = groupedPages(state.files, state.pages)
      if (sameMergePages(state.pages, pages)) return state
      const label = state.files.length > 1 ? 'Agrupaste las hojas por archivo.' : 'Restauraste el orden original.'
      return remember(state, state.files, pages, label)
    }
    case 'result':
      return {
        ...state,
        phase: 'idle',
        error: null,
        result: { signature: action.signature, bytes: action.bytes },
        status: action.status,
      }
    default:
      return state
  }
}

function remember(state: DocState, files: DocFile[], pages: DocPage[], label: string): DocState {
  const steps = state.steps.slice(0, state.index + 1)
  steps.push({ label, files, pages, at: Date.now() })
  const overflow = steps.length - (maxHistoryActions + 1)
  const trimmed = overflow > 0 ? steps.slice(overflow) : steps
  const ids = new Set([...pages.map((page) => page.id), ...files.map((file) => file.id)])
  return {
    ...state,
    files,
    pages,
    steps: trimmed,
    index: trimmed.length - 1,
    status: label,
    error: null,
    phase: 'idle',
    result: null,
    selectedIds: state.selectedIds.filter((id) => ids.has(id)),
    anchorId: state.anchorId && ids.has(state.anchorId) ? state.anchorId : null,
  }
}

function visit(state: DocState, index: number): DocState {
  const step = state.steps[index]
  if (!step || index === state.index) return state
  const ids = new Set([...step.pages.map((page) => page.id), ...step.files.map((file) => file.id)])
  return {
    ...state,
    index,
    files: step.files,
    pages: step.pages,
    status: step.label,
    result: null,
    selectedIds: state.selectedIds.filter((id) => ids.has(id)),
    anchorId: state.anchorId && ids.has(state.anchorId) ? state.anchorId : null,
  }
}

function selectDoc(state: DocState, id: string, mode: 'replace' | 'toggle' | 'range'): DocState {
  const pool = state.pages.some((page) => page.id === id) ? state.pages : state.files
  if (mode === 'replace') return { ...state, selectedIds: [id], anchorId: id }
  if (mode === 'toggle') {
    const selectedIds = state.selectedIds.includes(id)
      ? state.selectedIds.filter((item) => item !== id)
      : [...state.selectedIds, id]
    return { ...state, selectedIds, anchorId: id }
  }
  const anchor = state.anchorId ?? state.selectedIds[0] ?? id
  const anchorIndex = pool.findIndex((item) => item.id === anchor)
  const targetIndex = pool.findIndex((item) => item.id === id)
  if (anchorIndex < 0 || targetIndex < 0) return { ...state, selectedIds: [id], anchorId: id }
  const start = Math.min(anchorIndex, targetIndex)
  const end = Math.max(anchorIndex, targetIndex)
  return {
    ...state,
    selectedIds: pool.slice(start, end + 1).map((item) => item.id),
    anchorId: anchor,
  }
}
