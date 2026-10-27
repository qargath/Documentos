export function selectedInOrder<T extends { id: string }>(pages: readonly T[], selectedIds: readonly string[]) {
  const selected = new Set(selectedIds)
  return pages.filter((page) => selected.has(page.id))
}
