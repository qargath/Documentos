import { PDFDocument, rgb } from 'pdf-lib'
import { faceCss, placeNumber, type NumberFace, type NumberZone } from '../numbering'

export async function stampNumbers(
  bytes: Uint8Array,
  marks: { text: string | null }[],
  placement: { zone: NumberZone; align: number; size: number; face: NumberFace },
): Promise<Uint8Array> {
  const source = await PDFDocument.load(bytes, { updateMetadata: false })
  const output = await PDFDocument.create()
  const copied = await output.copyPages(source, source.getPageIndices())
  const cache = new Map<string, Promise<{ image: Awaited<ReturnType<typeof output.embedPng>>; width: number; height: number }>>()

  for (const [index, page] of copied.entries()) {
    output.addPage(page)
    const text = marks[index]?.text
    if (!text) continue
    const glyph = await glyphOf(output, cache, text, placement.size, placement.face)
    const box = placeNumber(
      placement.zone,
      placement.align,
      index,
      page.getWidth(),
      page.getHeight(),
      glyph.width,
      glyph.height,
    )
    const pad = 2
    page.drawRectangle({
      x: box.x - pad,
      y: box.y - pad,
      width: glyph.width + pad * 2,
      height: glyph.height + pad * 2,
      color: rgb(247 / 255, 244 / 255, 238 / 255),
    })
    page.drawImage(glyph.image, { x: box.x, y: box.y, width: glyph.width, height: glyph.height })
  }

  const title = source.getTitle()
  if (title) output.setTitle(title)
  output.setProducer('Document♥s')
  return output.save({ useObjectStreams: true })
}

function glyphOf(
  doc: PDFDocument,
  cache: Map<string, Promise<{ image: Awaited<ReturnType<typeof doc.embedPng>>; width: number; height: number }>>,
  text: string,
  size: number,
  face: NumberFace,
) {
  const key = `${face}:${size}:${text}`
  const found = cache.get(key)
  if (found) return found
  const pending = embedGlyph(doc, text, size, face)
  cache.set(key, pending)
  return pending
}

async function embedGlyph(doc: PDFDocument, text: string, size: number, face: NumberFace) {
  const glyph = paintGlyph(text, size, face)
  return { image: await doc.embedPng(glyph.bytes), width: glyph.width, height: glyph.height }
}

function paintGlyph(text: string, sizePt: number, face: NumberFace) {
  const scale = 8
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No pude dibujar el número.')
  const font = `${sizePt * scale}px ${faceCss(face)}`
  ctx.font = font
  const measured = ctx.measureText(text)
  const widthPx = Math.max(1, Math.ceil(measured.width) + scale)
  const heightPx = Math.max(1, Math.ceil(sizePt * scale))
  canvas.width = widthPx
  canvas.height = heightPx
  ctx.font = font
  ctx.fillStyle = '#211c18'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, scale / 2, heightPx / 2)
  const data = canvas.toDataURL('image/png')
  const raw = atob(data.slice(data.indexOf(',') + 1))
  const bytes = new Uint8Array(raw.length)
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index)
  return { bytes, width: widthPx / scale, height: heightPx / scale }
}
