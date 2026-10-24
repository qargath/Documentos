import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const pages = [
  { name: 'Uno', color: rgb(196 / 255, 81 / 255, 44 / 255) },
  { name: 'Dos', color: rgb(28 / 255, 107 / 255, 80 / 255) },
  { name: 'Tres', color: rgb(36 / 255, 92 / 255, 148 / 255) },
  { name: 'Cuatro', color: rgb(98 / 255, 62 / 255, 122 / 255) },
  { name: 'Cinco', color: rgb(179 / 255, 139 / 255, 77 / 255) },
  { name: 'Seis', color: rgb(33 / 255, 28 / 255, 24 / 255) },
]

export async function createSamplePdf(): Promise<Uint8Array> {
  const document = await PDFDocument.create()
  const bold = await document.embedFont(StandardFonts.HelveticaBold)
  const regular = await document.embedFont(StandardFonts.Helvetica)
  const white = rgb(1, 1, 1)

  pages.forEach((item, index) => {
    const page = document.addPage([420, 560])
    page.drawRectangle({ x: 0, y: 0, width: 420, height: 560, color: item.color })
    page.drawRectangle({
      x: 28,
      y: 28,
      width: 364,
      height: 504,
      borderColor: white,
      borderWidth: 2,
    })
    const numeral = String(index + 1)
    const numeralWidth = bold.widthOfTextAtSize(numeral, 132)
    page.drawText(numeral, {
      x: (420 - numeralWidth) / 2,
      y: 250,
      size: 132,
      font: bold,
      color: white,
    })
    const nameWidth = bold.widthOfTextAtSize(item.name, 32)
    page.drawText(item.name, {
      x: (420 - nameWidth) / 2,
      y: 190,
      size: 32,
      font: bold,
      color: white,
    })
    const caption = 'Página de ejemplo'
    const captionWidth = regular.widthOfTextAtSize(caption, 14)
    page.drawText(caption, {
      x: (420 - captionWidth) / 2,
      y: 72,
      size: 14,
      font: regular,
      color: white,
    })
  })

  document.setTitle('Ejemplo para ordenar')
  document.setProducer('Document♥s')
  return document.save()
}
