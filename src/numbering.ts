export type NumberZone = 'cabecera' | 'pie' | 'interno' | 'externo'

export const NUMBER_FACES = ['Arial', 'Times New Roman', 'Garamond', 'Georgia'] as const
export type NumberFace = (typeof NUMBER_FACES)[number]
export const NUMBER_FACE: NumberFace = 'Arial'
export const NUMBER_SIZE = 12

export function faceCss(face: NumberFace) {
  return face === 'Times New Roman' ? '"Times New Roman"' : face
}
export const NUMBER_BAND = 42

export interface PageMark {
  shown: number | null
  consumed: number | null
}

export function planNumbers(
  pageCount: number,
  fromPage: number,
  startAt: number,
  hidden: ReadonlySet<number>,
): PageMark[] {
  const marks: PageMark[] = []
  let next = startAt
  for (let index = 0; index < pageCount; index += 1) {
    if (index + 1 < fromPage) {
      marks.push({ shown: null, consumed: null })
      continue
    }
    const consumed = next
    next += 1
    marks.push({ shown: hidden.has(index) ? null : consumed, consumed })
  }
  return marks
}

export function edgeSide(zone: 'interno' | 'externo', pageIndex: number): 'left' | 'right' {
  const recto = pageIndex % 2 === 0
  if (zone === 'externo') return recto ? 'right' : 'left'
  return recto ? 'left' : 'right'
}

export function placeNumber(
  zone: NumberZone,
  align: number,
  pageIndex: number,
  pageWidth: number,
  pageHeight: number,
  textWidth: number,
  textHeight: number,
) {
  const along = clamp01(align)
  const inset = 8
  if (zone === 'cabecera' || zone === 'pie') {
    const travel = Math.max(pageWidth - textWidth - inset * 2, 0)
    const x = inset + along * travel
    const y =
      zone === 'cabecera'
        ? pageHeight - (NUMBER_BAND + textHeight) / 2
        : (NUMBER_BAND - textHeight) / 2
    return { x, y: Math.max(0, y) }
  }
  const side = edgeSide(zone, pageIndex)
  const x =
    side === 'left'
      ? Math.max(0, (NUMBER_BAND - textWidth) / 2)
      : pageWidth - NUMBER_BAND + (NUMBER_BAND - textWidth) / 2
  const travel = Math.max(pageHeight - textHeight - inset * 2, 0)
  const y = pageHeight - inset - textHeight - along * travel
  return { x: Math.max(0, x), y: Math.max(0, y) }
}

export function previewAnchor(zone: NumberZone, align: number, pageIndex: number) {
  const along = `${clamp01(align) * 100}%`
  if (zone === 'cabecera') return { left: along, top: '8%', transform: 'translate(-50%, -50%)' }
  if (zone === 'pie') return { left: along, top: '92%', transform: 'translate(-50%, -50%)' }
  const side = edgeSide(zone, pageIndex)
  return {
    left: side === 'left' ? '10%' : '90%',
    top: along,
    transform: 'translate(-50%, -50%)',
  }
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0.5
  return Math.min(1, Math.max(0, value))
}
