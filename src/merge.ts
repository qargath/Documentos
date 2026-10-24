import { placeGroup } from './order.ts'

export interface MergePage {
  id: string
  fileId: string
  sourceIndex: number
}

export function groupedPages<T extends MergePage>(files: { id: string }[], pages: T[]): T[] {
  return files.flatMap((file) =>
    pages.filter((page) => page.fileId === file.id).sort((left, right) => left.sourceIndex - right.sourceIndex),
  )
}

export function sameMergePages(left: { id: string }[], right: { id: string }[]) {
  return left.length === right.length && left.every((page, index) => page.id === right[index]?.id)
}

export function moveFileBlock<T extends MergePage>(
  pages: T[],
  fileId: string,
  toward: 'before' | 'after',
  neighborId: string,
): T[] {
  if (fileId === neighborId) return pages
  const moving = pages.filter((page) => page.fileId === fileId).map((page) => page.id)
  if (moving.length === 0) return pages
  const staying = pages.filter((page) => page.fileId !== fileId)
  const first = staying.findIndex((page) => page.fileId === neighborId)
  if (first < 0) return pages
  let insertAt = first
  if (toward === 'after') {
    let last = first
    for (let index = first; index < staying.length; index += 1) {
      if (staying[index]?.fileId === neighborId) last = index
    }
    insertAt = last + 1
  }
  return placeGroup(pages, moving, insertAt)
}

export function intactFileOrder(pages: { fileId: string }[]) {
  const order: string[] = []
  const seen = new Set<string>()
  for (const page of pages) {
    if (order.at(-1) === page.fileId) continue
    if (seen.has(page.fileId)) return null
    seen.add(page.fileId)
    order.push(page.fileId)
  }
  return order
}

export function pagesInFileOrder<T extends { fileId: string }>(files: { id: string }[], pages: T[]): T[] {
  return files.flatMap((file) => pages.filter((page) => page.fileId === file.id))
}

export function filesInOrder<T extends { id: string }>(files: T[], order: readonly string[]): T[] {
  const rank = new Map(order.map((id, index) => [id, index]))
  return files.slice().sort((left, right) => (rank.get(left.id) ?? order.length) - (rank.get(right.id) ?? order.length))
}

export function describeMerge(fileCount: number, pageCount: number) {
  if (fileCount === 0) return 'Agrega los PDF que quieres unir.'
  if (fileCount === 1) return 'Agrega al menos otro PDF para unirlos.'
  const pages = `${pageCount} ${pageCount === 1 ? 'página' : 'páginas'}`
  const files = `${fileCount} archivos`
  return `${files}, ${pages}. Arrastra los archivos para ordenarlos. En Ordenar páginas verás cada hoja.`
}
