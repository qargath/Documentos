import { PDFDocument } from 'pdf-lib'

export async function mergePdfs(
  files: { id: string; bytes: Uint8Array }[],
  pages: { fileId: string; sourceIndex: number }[],
): Promise<Uint8Array> {
  const loaded = new Map<string, PDFDocument>()
  for (const file of files) {
    loaded.set(file.id, await PDFDocument.load(file.bytes, { updateMetadata: false }))
  }

  const output = await PDFDocument.create()
  for (const page of pages) {
    const source = loaded.get(page.fileId)
    const count = source?.getPageCount() ?? 0
    if (!source || !Number.isInteger(page.sourceIndex) || page.sourceIndex < 0 || page.sourceIndex >= count) {
      throw new Error('Falta una página de alguno de los archivos.')
    }
    const [copied] = await output.copyPages(source, [page.sourceIndex])
    if (!copied) throw new Error('Falta una página de alguno de los archivos.')
    output.addPage(copied)
  }

  const first = files[0] ? loaded.get(files[0].id) : undefined
  const title = first?.getTitle()
  if (title) output.setTitle(title)
  output.setProducer('Document♥s')
  return output.save({ useObjectStreams: true })
}
