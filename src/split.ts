export type SplitMode = 'cortes' | 'intervalo' | 'hojas'

export interface PartSummary {
  title: string
  detail: string
}

export function splitParts<T extends { id: string }>(
  pages: T[],
  mode: SplitMode,
  cutAfterIds: readonly string[],
  every: number,
): T[][] {
  if (pages.length === 0) return []
  if (mode === 'hojas') return pages.map((page) => [page])
  if (mode === 'intervalo') {
    const size = Math.max(1, Math.floor(every) || 1)
    const parts: T[][] = []
    for (let index = 0; index < pages.length; index += size) parts.push(pages.slice(index, index + size))
    return parts
  }

  const cuts = new Set(cutAfterIds)
  const parts: T[][] = [[]]
  pages.forEach((page, index) => {
    parts.at(-1)?.push(page)
    if (index < pages.length - 1 && cuts.has(page.id)) parts.push([])
  })
  return parts.filter((part) => part.length > 0)
}

export function summarizeParts(parts: { sourceIndex: number }[][]): PartSummary[] {
  return parts.map((part, index) => ({
    title: `Parte ${index + 1}`,
    detail: `${pageSpan(part)} · ${part.length} ${part.length === 1 ? 'página' : 'páginas'}`,
  }))
}

export function describeSplit(mode: SplitMode, parts: { sourceIndex: number }[][], every: number) {
  if (parts.length === 0) return ''
  if (parts.length === 1) {
    if (mode === 'intervalo') return 'Con ese intervalo el PDF sigue siendo un solo archivo.'
    if (mode === 'hojas') return 'Este PDF tiene una sola página.'
    return 'Todavía es un solo archivo. Marca un corte después de una página.'
  }
  if (mode === 'hojas') return `Cada página será un archivo. Son ${parts.length}.`
  if (mode === 'intervalo') {
    const size = Math.max(1, Math.floor(every) || 1)
    return `Un archivo cada ${size} ${size === 1 ? 'página' : 'páginas'}. Son ${parts.length}.`
  }
  if (parts.length > 4) return `${parts.length} PDF.`
  return `${parts.length} PDF: ${joinSpanish(parts.map(pageSpan))}.`
}

function pageSpan(part: { sourceIndex: number }[]) {
  const numbers = part.map((page) => page.sourceIndex + 1)
  if (numbers.length === 0) return 'sin páginas'
  if (numbers.length === 1) return `pág. ${numbers[0]}`
  const consecutive = numbers.every((number, index) => index === 0 || number === numbers[index - 1] + 1)
  if (consecutive) return `pág. ${numbers[0]}–${numbers.at(-1)}`
  if (numbers.length <= 4) return `pág. ${joinSpanish(numbers.map(String))}`
  return `${numbers.length} páginas`
}

function joinSpanish(items: string[]) {
  if (items.length <= 1) return items[0] ?? ''
  if (items.length === 2) return `${items[0]} y ${items[1]}`
  return `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`
}
