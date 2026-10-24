import { PDFDocument } from 'pdf-lib'

export class EncryptedPdfError extends Error {
  constructor() {
    super(
      'Este PDF está protegido con contraseña. Por ahora no puedo abrirlo.',
    )
    this.name = 'EncryptedPdfError'
  }
}

export async function readPageCount(bytes: Uint8Array): Promise<number> {
  try {
    const document = await PDFDocument.load(bytes, { updateMetadata: false })
    return document.getPageCount()
  } catch (error) {
    if (isEncrypted(error)) throw new EncryptedPdfError()
    throw new Error('No pude leer este PDF. Puede estar dañado.')
  }
}

export async function reorderPdf(bytes: Uint8Array, order: number[]): Promise<Uint8Array> {
  const source = await PDFDocument.load(bytes, { updateMetadata: false })
  const pageCount = source.getPageCount()
  if (order.length !== pageCount || new Set(order).size !== pageCount) {
    throw new Error('El orden de las páginas no coincide con el documento.')
  }
  for (const index of order) {
    if (!Number.isInteger(index) || index < 0 || index >= pageCount) {
      throw new Error('El orden de las páginas no coincide con el documento.')
    }
  }

  const output = await PDFDocument.create()
  const pages = await output.copyPages(source, order)
  for (const page of pages) output.addPage(page)

  const title = source.getTitle()
  if (title) output.setTitle(title)
  output.setProducer('Document♥s')
  return output.save({ useObjectStreams: true })
}

export async function extractGroups(bytes: Uint8Array, groups: number[][]): Promise<Uint8Array[]> {
  const source = await PDFDocument.load(bytes, { updateMetadata: false })
  const pageCount = source.getPageCount()
  const title = source.getTitle()
  const files: Uint8Array[] = []

  for (const indices of groups) {
    if (indices.length === 0) throw new Error('Una parte no puede quedar vacía.')
    for (const index of indices) {
      if (!Number.isInteger(index) || index < 0 || index >= pageCount) {
        throw new Error('Una parte pide una página que no existe.')
      }
    }
    const output = await PDFDocument.create()
    const pages = await output.copyPages(source, indices)
    for (const page of pages) output.addPage(page)
    if (title) output.setTitle(title)
    output.setProducer('Document♥s')
    files.push(await output.save({ useObjectStreams: true }))
  }

  return files
}

function isEncrypted(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /encrypt/i.test(message)
}
