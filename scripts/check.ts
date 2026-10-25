import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PDFDocument } from 'pdf-lib'
import { idsInside, marqueeSelection } from '../src/marquee.ts'
import { moveGroup, placeGroup, stayingBeforeFirst } from '../src/order.ts'
import { describeSplit, equalCutIndexes, everyCutIndexes, splitParts } from '../src/split.ts'
import { initialState, maxHistoryActions, reducer, type PageItem } from '../src/state.ts'
import { describeMerge, intactFileOrder, moveFileBlock, pagesInFileOrder } from '../src/merge.ts'
import { mergePdfs } from '../src/pdf/merge.ts'
import { extractGroups, reorderPdf } from '../src/pdf/reorder.ts'
import { zipStore } from '../src/zip.ts'

const source = await PDFDocument.create()
for (let index = 0; index < 6; index += 1) {
  source.addPage([200 + index * 10, 300])
}
const bytes = await source.save()

const same = await reorderPdf(bytes, [0, 1, 2, 3, 4, 5])
assert.deepEqual(await widths(same), [200, 210, 220, 230, 240, 250])

const reversed = await reorderPdf(bytes, [5, 4, 3, 2, 1, 0])
assert.deepEqual(await widths(reversed), [250, 240, 230, 220, 210, 200])

const mixed = await reorderPdf(bytes, [2, 0, 5, 1, 4, 3])
assert.deepEqual(await widths(mixed), [220, 200, 250, 210, 240, 230])

await assert.rejects(() => reorderPdf(bytes, [0, 1, 2]), /no coincide/)

const deck = ['1', '2', '3', '4', '5', '6'].map((id) => ({ id }))
const orderOf = (items: { id: string }[]) => items.map((item) => item.id).join('')

assert.equal(orderOf(moveGroup(deck, ['1'], '1', '6')), '234561')
assert.equal(orderOf(moveGroup(deck, ['6'], '6', '2')), '162345')
assert.equal(orderOf(moveGroup(deck, ['2', '4'], '2', '6')), '135624')
assert.equal(orderOf(moveGroup(deck, ['2', '4'], '4', '6')), '135624')
assert.equal(orderOf(moveGroup(deck, ['2', '4'], '2', '1')), '241356')
assert.equal(orderOf(moveGroup(deck, ['2', '4'], '4', '1')), '241356')
assert.equal(orderOf(moveGroup(deck, ['2', '4'], '2', '3')), '132456')
assert.equal(orderOf(moveGroup(deck, ['2', '4'], '4', '3')), '124356')
assert.equal(orderOf(moveGroup(deck, ['2', '4'], '2', '2')), '123456')

const before = stayingBeforeFirst(deck, ['2', '4'])
assert.equal(before, 1)
assert.equal(orderOf(placeGroup(deck, ['2', '4'], 0)), '241356')
assert.equal(orderOf(placeGroup(deck, ['2', '4'], before - 1)), '241356')
assert.equal(orderOf(placeGroup(deck, ['2', '4'], before + 1)), '132456')
assert.equal(orderOf(placeGroup(deck, ['2', '4'], 4)), '135624')

const boxes = [
  { id: 'a', left: 0, top: 0, right: 10, bottom: 10 },
  { id: 'b', left: 20, top: 0, right: 30, bottom: 10 },
  { id: 'c', left: 0, top: 20, right: 10, bottom: 30 },
  { id: 'd', left: 20, top: 20, right: 30, bottom: 30 },
]
assert.deepEqual(idsInside(boxes, { left: 5, top: 0, right: 25, bottom: 10 }), ['a', 'b'])
assert.deepEqual(idsInside(boxes, { left: 29, top: 29, right: 40, bottom: 40 }), ['d'])
assert.deepEqual(idsInside(boxes, { left: 10, top: 0, right: 20, bottom: 10 }), [])
assert.deepEqual(marqueeSelection(['a'], ['b', 'c'], true), ['a', 'b', 'c'])
assert.deepEqual(marqueeSelection(['a', 'b'], ['b', 'c'], true), ['a', 'b', 'c'])
assert.deepEqual(marqueeSelection(['a'], ['b'], false), ['b'])

const historyPages = (order: number[]): PageItem[] => order.map((sourceIndex) => ({ id: String(sourceIndex), sourceIndex }))
let history = reducer(initialState, {
  type: 'loaded',
  name: 'a.pdf',
  bytes: new Uint8Array(),
  pages: historyPages([0, 1, 2]),
})
history = reducer(history, { type: 'commit', pages: historyPages([1, 0, 2]), status: 'Paso A' })
history = reducer(history, { type: 'commit', pages: historyPages([1, 2, 0]), status: 'Paso B' })
history = reducer(history, { type: 'undo' })
assert.deepEqual(history.pages.map((page) => page.sourceIndex), [1, 0, 2])
assert.equal(history.steps.length, 3)
history = reducer(history, { type: 'redo' })
assert.deepEqual(history.pages.map((page) => page.sourceIndex), [1, 2, 0])
history = reducer(history, { type: 'undo' })
history = reducer(history, { type: 'commit', pages: historyPages([2, 1, 0]), status: 'Paso C' })
assert.deepEqual(
  history.steps.map((step) => step.label),
  ['Orden original', 'Paso A', 'Paso C'],
)
history = reducer(history, { type: 'goto', index: 0 })
assert.deepEqual(history.pages.map((page) => page.sourceIndex), [0, 1, 2])
assert.equal(reducer(history, { type: 'undo' }), history)

let capped = reducer(initialState, {
  type: 'loaded',
  name: 'b.pdf',
  bytes: new Uint8Array(),
  pages: historyPages([0]),
})
for (let step = 1; step <= 105; step += 1) {
  capped = reducer(capped, { type: 'commit', pages: historyPages([0]), status: `Paso ${step}` })
}
assert.equal(capped.steps.length, maxHistoryActions + 1)
assert.equal(capped.steps[0]?.label, 'Paso 5')
assert.equal(capped.steps.at(-1)?.label, 'Paso 105')
assert.equal(capped.index, maxHistoryActions)

const sheets = deck.map((page, index) => ({ ...page, sourceIndex: index }))
assert.deepEqual(
  splitParts(sheets, 'cortes', ['2', '4'], 2).map((part) => part.map((page) => page.id).join('')),
  ['12', '34', '56'],
)
assert.deepEqual(
  splitParts(sheets, 'cortes', ['6'], 2).map((part) => part.map((page) => page.id).join('')),
  ['123456'],
)
assert.deepEqual(
  splitParts(sheets, 'intervalo', [], 2).map((part) => part.length),
  [2, 2, 2],
)
assert.equal(splitParts(sheets, 'hojas', [], 2).length, 6)
assert.equal(describeSplit('cortes', splitParts(sheets, 'cortes', ['2'], 2), 2), '2 PDF: pág. 1–2 y pág. 3–6.')
assert.deepEqual(equalCutIndexes(42, 4), [9, 19, 29])
assert.deepEqual(everyCutIndexes(42, 10), [9, 19, 29, 39])

const pieces = await extractGroups(bytes, [
  [0, 2],
  [5],
])
assert.deepEqual(await widths(pieces[0]), [200, 220])
assert.deepEqual(await widths(pieces[1]), [250])

const packed = zipStore([{ name: 'hola.txt', bytes: new TextEncoder().encode('123456789') }])
assert.equal(packed[0], 0x50)
assert.equal(packed[1], 0x4b)
assert.equal(new DataView(packed.buffer, packed.byteOffset, packed.byteLength).getUint32(14, true), 0xcbf43926)
assert.equal(new TextDecoder().decode(packed.slice(30, 38)), 'hola.txt')

const blocks = [
  { id: 'A1', fileId: 'A', sourceIndex: 0 },
  { id: 'A2', fileId: 'A', sourceIndex: 1 },
  { id: 'B1', fileId: 'B', sourceIndex: 0 },
  { id: 'B2', fileId: 'B', sourceIndex: 1 },
  { id: 'C1', fileId: 'C', sourceIndex: 0 },
]
const blockIds = (pages: { id: string }[]) => pages.map((page) => page.id).join(' ')
assert.equal(blockIds(moveFileBlock(blocks, 'B', 'after', 'C')), 'A1 A2 C1 B1 B2')
assert.equal(blockIds(moveFileBlock(blocks, 'B', 'before', 'A')), 'B1 B2 A1 A2 C1')
assert.equal(blockIds(moveFileBlock(blocks, 'C', 'before', 'B')), 'A1 A2 C1 B1 B2')
assert.equal(
  describeMerge(2, 5),
  '2 archivos, 5 páginas. Arrastra los archivos para ordenarlos. En Ordenar páginas verás cada hoja.',
)
assert.equal(describeMerge(1, 3), 'Agrega al menos otro PDF para unirlos.')
assert.deepEqual(
  intactFileOrder([
    { fileId: 'A' },
    { fileId: 'A' },
    { fileId: 'B' },
  ]),
  ['A', 'B'],
)
assert.equal(
  intactFileOrder([
    { fileId: 'A' },
    { fileId: 'B' },
    { fileId: 'A' },
  ]),
  null,
)
assert.equal(
  pagesInFileOrder(
    [{ id: 'B' }, { id: 'A' }],
    [
      { id: 'A2', fileId: 'A' },
      { id: 'A1', fileId: 'A' },
      { id: 'B1', fileId: 'B' },
    ],
  )
    .map((page) => page.id)
    .join(' '),
  'B1 A2 A1',
)

const docA = await PDFDocument.create()
docA.addPage([200, 100])
docA.addPage([210, 100])
const docB = await PDFDocument.create()
docB.addPage([300, 100])
const joined = await mergePdfs(
  [
    { id: 'A', bytes: await docA.save() },
    { id: 'B', bytes: await docB.save() },
  ],
  [
    { fileId: 'A', sourceIndex: 1 },
    { fileId: 'B', sourceIndex: 0 },
    { fileId: 'A', sourceIndex: 0 },
  ],
)
assert.deepEqual(await widths(joined), [210, 300, 200])

const version = readFileSync(new URL('../VERSION', import.meta.url), 'utf8').trim()
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }
const notes = JSON.parse(readFileSync(new URL('../src/release-notes.json', import.meta.url), 'utf8')) as { version: string }[]
assert.match(version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/)
assert.equal(packageJson.version, version, 'package.json no coincide con VERSION')
assert.equal(notes[0]?.version, version, 'La nota visible no coincide con VERSION')
assert.equal(notes.filter((note) => note.version === version).length, 1)

console.log('orden de páginas ok')

async function widths(pdf: Uint8Array) {
  const document = await PDFDocument.load(pdf)
  return document.getPages().map((page) => page.getWidth())
}
