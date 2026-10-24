export interface Bounds {
  id: string
  left: number
  top: number
  right: number
  bottom: number
}

export interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

export function idsInside(boxes: Bounds[], rect: Rect) {
  return boxes
    .filter(
      (box) =>
        box.right > box.left &&
        box.bottom > box.top &&
        box.left < rect.right &&
        box.right > rect.left &&
        box.top < rect.bottom &&
        box.bottom > rect.top,
    )
    .map((box) => box.id)
}

export function marqueeSelection(baseIds: string[], hitIds: string[], additive: boolean) {
  if (!additive) return hitIds
  const seen = new Set(baseIds)
  return [...baseIds, ...hitIds.filter((id) => !seen.has(id))]
}
