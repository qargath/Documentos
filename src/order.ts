export function moveGroup<T extends { id: string }>(
  pages: T[],
  selectedIds: string[],
  activeId: string,
  overId: string,
): T[] {
  if (activeId === overId) return pages
  const movingIds = selectedIds.includes(activeId) ? selectedIds : [activeId]
  const moving = new Set(movingIds)
  const activeIndex = pages.findIndex((page) => page.id === activeId)
  const overIndex = pages.findIndex((page) => page.id === overId)
  if (activeIndex < 0 || overIndex < 0) return pages

  const group = pages.filter((page) => moving.has(page.id))
  const staying = pages.filter((page) => !moving.has(page.id))
  const insertAt = moving.has(overId)
    ? pages.slice(0, overIndex).filter((page) => !moving.has(page.id)).length
    : staying.findIndex((page) => page.id === overId) + (activeIndex < overIndex ? 1 : 0)

  const next = staying.slice()
  next.splice(insertAt, 0, ...group)
  return sameIds(pages, next) ? pages : next
}

export function placeGroup<T extends { id: string }>(pages: T[], selectedIds: string[], insertAt: number): T[] {
  const moving = new Set(selectedIds)
  const group = pages.filter((page) => moving.has(page.id))
  if (group.length === 0) return pages
  const staying = pages.filter((page) => !moving.has(page.id))
  const index = Math.max(0, Math.min(insertAt, staying.length))
  const next = staying.slice()
  next.splice(index, 0, ...group)
  return sameIds(pages, next) ? pages : next
}

export function stayingBeforeFirst<T extends { id: string }>(pages: T[], selectedIds: string[]) {
  const moving = new Set(selectedIds)
  const first = pages.findIndex((page) => moving.has(page.id))
  if (first < 0) return 0
  return pages.slice(0, first).filter((page) => !moving.has(page.id)).length
}

function sameIds<T extends { id: string }>(left: T[], right: T[]) {
  return left.length === right.length && left.every((page, index) => page.id === right[index]?.id)
}
