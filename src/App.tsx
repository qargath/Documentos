import { useEffect, useReducer, useRef, useState, type PointerEvent } from 'react'
import { DetailsPanel } from './components/DetailsPanel'
import { NumberStage, type NumberMode, type NumberStep } from './components/NumberStage'
import { FileDeck } from './components/FileDeck'
import { PageGrid } from './components/PageGrid'
import { ReleaseNotesView } from './components/ReleaseNotes'
import { Sidebar, toolById, type ToolId } from './components/Sidebar'
import { mergeTone } from './components/MergePanel'
import { SplitStage } from './components/SplitStage'
import { docReducer, docSignature, initialDoc, type DocFile, type DocPage } from './document'
import { selectedInOrder } from './extract'
import { useMergeThumbs } from './hooks/useMergeThumbs'
import { useThumbs } from './hooks/useThumbs'
import { idsInside, marqueeSelection, type Rect } from './marquee'
import { describeMerge, filesInOrder, groupedPages, intactFileOrder, pagesInFileOrder, sameMergePages } from './merge'
import { NUMBER_FACE, NUMBER_SIZE, planNumbers, type NumberFace, type NumberZone } from './numbering'
import { stampNumbers } from './pdf/number'
import { moveGroup, placeGroup, stayingBeforeFirst } from './order'
import { mergePdfs } from './pdf/merge'
import { EncryptedPdfError, extractGroups, readPageCount } from './pdf/reorder'
import { createSamplePdf } from './pdf/sample'
import { describeSplit, splitParts, summarizeParts } from './split'
import { zipStore } from './zip'

export default function App() {
  const [state, dispatch] = useReducer(docReducer, initialDoc)
  const pagesRef = useRef(state.pages)
  const filesRef = useRef(state.files)
  const selectedRef = useRef(state.selectedIds)
  pagesRef.current = state.pages
  filesRef.current = state.files
  selectedRef.current = state.selectedIds
  const inputRef = useRef<HTMLInputElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const bandRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef(state.anchorId)
  const marqueeRef = useRef<MarqueeDrag | null>(null)
  const cancelMarqueeRef = useRef<() => void>(() => {})
  const bakingRef = useRef(false)
  anchorRef.current = state.anchorId
  const docThumbs = useMergeThumbs(state.files)
  const resultThumbs = useThumbs(state.result?.bytes ?? null)
  const grouped = groupedPages(state.files, state.pages)
  const changed = !sameMergePages(state.pages, grouped)
  const signature = docSignature(state.pages)
  const fresh = state.result?.signature === signature
  const beforeFirst = stayingBeforeFirst(state.pages, state.selectedIds)
  const stayingCount = state.pages.length - state.selectedIds.length
  const [tool, setTool] = useState<ToolId>('ordenar')
  const [notesOpen, setNotesOpen] = useState(false)
  const [cutAfter, setCutAfter] = useState<string[]>([])
  const [splitResult, setSplitResult] = useState<SplitBundle | null>(null)
  const [extractResult, setExtractResult] = useState<ExtractBundle | null>(null)
  const [numberMode, setNumberMode] = useState<NumberMode | null>(null)
  const [numberStep, setNumberStep] = useState<NumberStep>('modo')
  const [numberFrom, setNumberFrom] = useState(1)
  const [numberStart, setNumberStart] = useState(1)
  const [numberZone, setNumberZone] = useState<NumberZone>('pie')
  const [numberAlign, setNumberAlign] = useState(0.5)
  const [numberSize, setNumberSize] = useState(NUMBER_SIZE)
  const [numberFace, setNumberFace] = useState<NumberFace>(NUMBER_FACE)
  const [numberExcluded, setNumberExcluded] = useState<string[]>([])
  const [numberSample, setNumberSample] = useState<string | null>(null)
  const [numberResult, setNumberResult] = useState<ExtractBundle | null>(null)
  const toolRef = useRef(tool)
  const notesRef = useRef(notesOpen)
  notesRef.current = notesOpen
  const cutRef = useRef(cutAfter)
  toolRef.current = tool
  cutRef.current = cutAfter
  const parts = splitParts(state.pages, 'cortes', cutAfter, 1)
  const splitSignature = splitKey(state.pages, cutAfter)
  const splitReady = splitResult?.signature === splitSignature && splitResult.files.length > 1
  const splitLabels = parts.map((part) =>
    part.map((page) => ({
      sourceIndex: state.files.length > 1 ? state.pages.findIndex((item) => item.id === page.id) : page.sourceIndex,
    })),
  )
  const splitStatus = splitReady
    ? 'Los archivos están listos. Revísalos y descárgalos.'
    : describeSplit('cortes', splitLabels, 1)
  const splitting = tool === 'dividir'
  const merging = tool === 'unir'
  const extracting = tool === 'extraer'
  const numbering = tool === 'numerar'
  const numberFromPage = Math.min(Math.max(1, numberFrom), Math.max(state.pages.length, 1))
  const numberAlignNow = numberMode === 'automatico' ? 0.5 : numberAlign
  const numberSizeNow = numberMode === 'automatico' ? NUMBER_SIZE : numberSize
  const numberFaceNow = numberMode === 'automatico' ? NUMBER_FACE : numberFace
  const numberHidden = numberMode === 'asistido' ? numberExcluded : []
  const numberSignature = numberKey(
    state.pages,
    numberMode,
    numberFromPage,
    numberStart,
    numberZone,
    numberAlignNow,
    numberSizeNow,
    numberFaceNow,
    numberHidden,
  )
  const numberReady = numberMode != null && state.pages.length > 0 && numberResult?.signature === numberSignature
  const extractPages = selectedInOrder(state.pages, state.selectedIds)
  const extractSignature = extractPages.map((page) => page.id).join('|')
  const extractReady = extractSignature !== '' && extractResult?.signature === extractSignature
  const manyFiles = state.files.length > 1
  const thumbList = state.pages.map((page) => docThumbs.urls[page.fileId]?.[page.sourceIndex] ?? '')
  const fileIndex = new Map(state.files.map((file, index) => [file.id, index]))
  const fileNameOf = new Map(state.files.map((file) => [file.id, fileTitle(file.name)]))
  const selectedFileIndex = state.files.findIndex((file) => file.id === state.selectedIds[0])
  const orderStatus = manyFiles
    ? state.status && state.status !== 'Orden original'
      ? state.status
      : 'Estas son las hojas de los archivos, en el orden en que los dejaste. Si mezclas hojas de archivos distintos, pasa a ser un solo PDF.'
    : state.status
  const joinStatus =
    state.phase === 'loading'
      ? 'Abriendo…'
      : fresh && manyFiles
        ? 'El PDF está listo. Revísalo y descárgalo.'
        : describeMerge(state.files.length, state.pages.length)
  const { mainRef, cardWidth } = useSheetScale(!notesOpen)
  const canUndo = state.index > 0
  const canRedo = state.index < state.steps.length - 1
  const canMoveEarlier = merging ? selectedFileIndex > 0 : state.selectedIds.length > 0 && beforeFirst > 0
  const canMoveLater = merging
    ? selectedFileIndex >= 0 && selectedFileIndex < state.files.length - 1
    : state.selectedIds.length > 0 && beforeFirst < stayingCount

  useEffect(() => {
    function prevent(event: DragEvent) {
      event.preventDefault()
    }
    window.addEventListener('dragover', prevent)
    window.addEventListener('drop', prevent)
    return () => {
      window.removeEventListener('dragover', prevent)
      window.removeEventListener('drop', prevent)
    }
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
      if (event.key === 'Escape') {
        if (notesRef.current) {
          setNotesOpen(false)
          return
        }
        if (marqueeRef.current) {
          cancelMarqueeRef.current()
          return
        }
        if (toolRef.current === 'dividir' && cutRef.current.length > 0) {
          publishCuts([])
          return
        }
        dispatch({ type: 'clear-selection' })
        return
      }
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== 'z') return
      event.preventDefault()
      dispatch({ type: event.shiftKey ? 'redo' : 'undo' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function loadBytes(name: string, bytes: Uint8Array) {
    dispatch({ type: 'start', phase: 'loading' })
    try {
      const count = await readPageCount(bytes)
      if (count < 1) {
        dispatch({ type: 'fail', message: 'Este PDF no tiene páginas.' })
        return
      }
      const file = makeFile(name, bytes, count)
      dispatch({
        type: 'load',
        files: [file.file],
        pages: file.pages,
        status: count === 1 ? 'Este PDF tiene una sola página. No hay otra posición a la que moverla.' : '',
      })
      cutRef.current = []
      setCutAfter([])
      setSplitResult(null)
      setExtractResult(null)
      resetNumbering()
    } catch (error) {
      console.error(error)
      const message =
        error instanceof EncryptedPdfError
          ? error.message
          : 'No pude leer este PDF. Puede estar dañado.'
      dispatch({ type: 'fail', message })
    }
  }

  async function onFiles(files: File[]) {
    const pdfs = files.filter(isPdf)
    if (pdfs.length === 0) {
      dispatch({ type: 'fail', message: 'Suelta un archivo PDF.' })
      return
    }
    if (toolRef.current === 'unir') {
      const packed = await Promise.all(pdfs.map(async (file) => ({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) })))
      await addDocuments(packed)
      return
    }
    const file = pdfs[0]
    if (!file) return
    await loadBytes(file.name, new Uint8Array(await file.arrayBuffer()))
  }

  function applyOrder(next: DocPage[], selectedIds: string[]) {
    if (bakingRef.current || sameMergePages(pagesRef.current, next)) return
    const order = intactFileOrder(next)
    if (!order) {
      void bakeMixed(next, selectedIds)
      return
    }
    const moved = next.filter((page) => selectedIds.includes(page.id))
    const place = next.findIndex((page) => page.id === moved[0]?.id) + 1
    dispatch({
      type: 'commit',
      files: filesInOrder(filesRef.current, order),
      pages: next,
      selectedIds,
      label: describeMove(moved, place, filesRef.current),
    })
  }

  function moveSelection(insertAt: number) {
    const ids = selectedRef.current
    if (ids.length === 0) return
    applyOrder(placeGroup(pagesRef.current, ids, insertAt), ids)
  }

  function moveDragged(activeId: string, overId: string) {
    const ids = selectedRef.current
    const moving = ids.includes(activeId) ? ids : [activeId]
    applyOrder(moveGroup(pagesRef.current, ids, activeId, overId), moving)
  }

  async function prepare() {
    if (filesRef.current.length === 0 || pagesRef.current.length === 0) return
    const pages = pagesRef.current
    const files = filesRef.current
    const signatureNow = docSignature(pages)
    dispatch({ type: 'start', phase: 'building' })
    try {
      const bytes = await mergePdfs(files, pages)
      dispatch({
        type: 'result',
        signature: signatureNow,
        bytes,
        status: 'El PDF está listo. Revísalo y descárgalo.',
      })
    } catch (error) {
      console.error(error)
      dispatch({ type: 'fail', message: 'No pude armar el PDF con este orden.' })
    }
  }

  function download() {
    if (!state.result || !fresh || state.files.length === 0) return
    const base = fileTitle(state.files[0]?.name ?? 'documento')
    saveBytes(state.result.bytes, state.files.length > 1 ? `${base}-unido.pdf` : pdfName(state.files[0]?.name ?? 'documento'))
  }

  function publishSelection(ids: string[], anchorId: string | null) {
    const current = selectedRef.current
    const sameIds = current.length === ids.length && current.every((id, index) => id === ids[index])
    if (sameIds && anchorRef.current === anchorId) return
    selectedRef.current = ids
    anchorRef.current = anchorId
    dispatch({ type: 'set-selection', ids, anchorId })
  }

  function publishCuts(ids: string[]) {
    const pages = pagesRef.current
    const lastId = pages.at(-1)?.id
    const allowed = new Set(pages.map((page) => page.id))
    const next: string[] = []
    const seen = new Set<string>()
    for (const id of ids) {
      if (!allowed.has(id) || id === lastId || seen.has(id)) continue
      seen.add(id)
      next.push(id)
    }
    const current = cutRef.current
    if (current.length === next.length && current.every((id, index) => id === next[index])) return
    cutRef.current = next
    setCutAfter(next)
    setSplitResult(null)
  }

  function commitFiles(files: DocFile[], label: string) {
    if (bakingRef.current) return
    const pages = pagesInFileOrder(files, pagesRef.current)
    const sameFiles =
      files.length === filesRef.current.length && files.every((file, index) => file.id === filesRef.current[index]?.id)
    if (sameFiles && sameMergePages(pages, pagesRef.current)) return
    dispatch({ type: 'commit', files, pages, label, selectedIds: selectedRef.current })
  }

  function shiftFile(fileId: string, toward: 'before' | 'after') {
    const files = filesRef.current.slice()
    const from = files.findIndex((file) => file.id === fileId)
    const insertAt = from + (toward === 'before' ? -1 : 1)
    if (from < 0 || insertAt < 0 || insertAt >= files.length) return
    const [item] = files.splice(from, 1)
    if (!item) return
    files.splice(insertAt, 0, item)
    commitFiles(files, `Moviste ${fileTitle(item.name)}.`)
  }

  function moveSelectedFile(insertAt: number) {
    const id = selectedRef.current.find((item) => filesRef.current.some((file) => file.id === item))
    if (!id) return
    const files = filesRef.current.slice()
    const from = files.findIndex((file) => file.id === id)
    const [item] = files.splice(from, 1)
    if (!item) return
    files.splice(Math.max(0, Math.min(insertAt, files.length)), 0, item)
    commitFiles(files, `Moviste ${fileTitle(item.name)}.`)
  }

  function reorderFiles(activeId: string, overId: string) {
    const next = moveGroup(filesRef.current, [activeId], activeId, overId)
    if (next === filesRef.current) return
    const file = filesRef.current.find((item) => item.id === activeId)
    commitFiles(next, file ? `Moviste ${fileTitle(file.name)}.` : 'El orden de los archivos cambió.')
  }

  function removeFile(fileId: string) {
    const file = filesRef.current.find((item) => item.id === fileId)
    if (!file) return
    const files = filesRef.current.filter((item) => item.id !== fileId)
    const pages = pagesRef.current.filter((page) => page.fileId !== fileId)
    dispatch({ type: 'commit', files, pages, label: `Quitaste ${fileTitle(file.name)}.`, selectedIds: [] })
    publishCuts(cutRef.current.filter((id) => pages.some((page) => page.id === id)))
  }

  async function bakeMixed(next: DocPage[], selectedIds: string[]) {
    if (bakingRef.current) return
    bakingRef.current = true
    const sources = filesRef.current
    dispatch({ type: 'start', phase: 'building' })
    try {
      const bytes = await mergePdfs(sources, next)
      const id = crypto.randomUUID()
      const file: DocFile = { id, name: joinedName(sources), bytes }
      const pages = next.map((_, index) => ({ id: `${id}-${index}`, fileId: id, sourceIndex: index }))
      const selected = pages.filter((_, index) => selectedIds.includes(next[index]?.id ?? '')).map((page) => page.id)
      cutRef.current = []
      setCutAfter([])
      setSplitResult(null)
      setExtractResult(null)
      resetNumbering()
      dispatch({
        type: 'commit',
        files: [file],
        pages,
        selectedIds: selected,
        label: 'Mezclaste hojas de distintos archivos. Ahora es un solo PDF. Para sacar varios, usa Dividir.',
        result: { signature: docSignature(pages), bytes },
      })
    } catch (error) {
      console.error(error)
      dispatch({ type: 'fail', message: 'No pude dejar estas páginas en un solo PDF.' })
    } finally {
      bakingRef.current = false
    }
  }

  async function addDocuments(documents: { name: string; bytes: Uint8Array }[]) {
    if (documents.length === 0) {
      dispatch({ type: 'fail', message: 'Suelta un archivo PDF.' })
      return
    }
    dispatch({ type: 'start', phase: 'loading' })
    const added: { file: DocFile; pages: DocPage[] }[] = []
    const problems: string[] = []
    for (const document of documents) {
      try {
        const count = await readPageCount(document.bytes)
        if (count < 1) {
          problems.push(`${fileTitle(document.name)} no tiene páginas.`)
          continue
        }
        added.push(makeFile(document.name, document.bytes, count))
      } catch (error) {
        console.error(error)
        problems.push(
          error instanceof EncryptedPdfError
            ? `${fileTitle(document.name)} está protegido con contraseña.`
            : `No pude leer ${fileTitle(document.name)}.`,
        )
      }
    }
    if (added.length > 0) {
      const files = added.map((item) => item.file)
      const pages = added.flatMap((item) => item.pages)
      if (filesRef.current.length === 0) {
        dispatch({
          type: 'load',
          files,
          pages,
          status:
            files.length === 1 && pages.length === 1
              ? 'Este PDF tiene una sola página. No hay otra posición a la que moverla.'
              : '',
        })
      } else {
        const label =
          files.length === 1
            ? `Agregaste ${fileTitle(files[0]?.name ?? 'un PDF')}.`
            : `Agregaste ${files.length} archivos.`
        dispatch({ type: 'add', files, pages, label })
      }
    }
    if (problems.length > 0) dispatch({ type: 'fail', message: problems[0] ?? 'No pude leer un PDF.' })
  }

  function chooseTool(next: ToolId) {
    setNotesOpen(false)
    dispatch({ type: 'clear-selection' })
    setTool(next)
  }


  async function prepareSplit() {
    if (filesRef.current.length === 0) return
    const pages = pagesRef.current
    const files = filesRef.current
    const partList = splitParts(pages, 'cortes', cutAfter, 1)
    if (partList.length < 2) return
    const signature = splitKey(pages, cutAfter)
    const title = fileTitle(files[0]?.name ?? 'documento')
    dispatch({ type: 'start', phase: 'building' })
    try {
      const merged = await mergePdfs(files, pages)
      const groups = await extractGroups(
        merged,
        partList.map((part) => part.map((page) => pages.findIndex((item) => item.id === page.id))),
      )
      setSplitResult({
        signature,
        files: groups.map((bytes, index) => ({ name: `${title}-${index + 1}.pdf`, bytes })),
      })
      dispatch({ type: 'idle' })
    } catch (error) {
      console.error(error)
      dispatch({ type: 'fail', message: 'No pude dividir este PDF.' })
    }
  }

  async function prepareExtract() {
    if (filesRef.current.length === 0) return
    const pages = selectedInOrder(pagesRef.current, selectedRef.current)
    if (pages.length === 0) return
    const signature = pages.map((page) => page.id).join('|')
    dispatch({ type: 'start', phase: 'building' })
    try {
      const bytes = await mergePdfs(filesRef.current, pages)
      setExtractResult({ signature, bytes })
      dispatch({ type: 'idle' })
    } catch (error) {
      console.error(error)
      dispatch({ type: 'fail', message: 'No pude extraer estas páginas.' })
    }
  }

  function downloadExtract() {
    if (!extractReady || !extractResult || state.files.length === 0) return
    const base = fileTitle(state.files[0]?.name ?? 'documento')
    saveBytes(extractResult.bytes, `${base}-extraido.pdf`)
  }

  function resetNumbering() {
    setNumberMode(null)
    setNumberStep('modo')
    setNumberFrom(1)
    setNumberStart(1)
    setNumberZone('pie')
    setNumberAlign(0.5)
    setNumberSize(NUMBER_SIZE)
    setNumberFace(NUMBER_FACE)
    setNumberExcluded([])
    setNumberSample(null)
    setNumberResult(null)
  }

  function chooseNumberMode(mode: NumberMode) {
    setNumberMode(mode)
    setNumberStep('config')
    if (mode === 'automatico') {
      setNumberZone('pie')
      setNumberAlign(0.5)
      setNumberSize(NUMBER_SIZE)
      setNumberFace(NUMBER_FACE)
      setNumberExcluded([])
    }
  }

  function goNumberStep(next: NumberStep) {
    if (next === 'insercion') {
      const hidden = new Set(
        pagesRef.current.flatMap((page, index) => (numberExcluded.includes(page.id) ? [index] : [])),
      )
      const marks = planNumbers(pagesRef.current.length, numberFromPage, numberStart, hidden)
      const pool = pagesRef.current.filter((_, index) => marks[index]?.consumed != null)
      const source = pool.length > 0 ? pool : pagesRef.current
      if (!source.some((page) => page.id === numberSample)) {
        const pick = source[Math.floor(Math.random() * source.length)]
        setNumberSample(pick?.id ?? null)
      }
    }
    setNumberStep(next)
  }

  function toggleNumberPage(id: string) {
    setNumberExcluded((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  async function prepareNumber() {
    if (!numberMode || filesRef.current.length === 0 || pagesRef.current.length === 0) return
    const pages = pagesRef.current
    const fromPage = Math.min(Math.max(1, numberFrom), Math.max(pages.length, 1))
    const align = numberMode === 'automatico' ? 0.5 : numberAlign
    const size = numberMode === 'automatico' ? NUMBER_SIZE : numberSize
    const face = numberMode === 'automatico' ? NUMBER_FACE : numberFace
    const excluded = numberMode === 'asistido' ? numberExcluded : []
    const hidden = new Set(pages.flatMap((page, index) => (excluded.includes(page.id) ? [index] : [])))
    const marks = planNumbers(pages.length, fromPage, numberStart, hidden)
    const signature = numberKey(pages, numberMode, fromPage, numberStart, numberZone, align, size, face, excluded)
    dispatch({ type: 'start', phase: 'building' })
    try {
      const merged = await mergePdfs(filesRef.current, pages)
      const bytes = await stampNumbers(
        merged,
        marks.map((mark) => ({ text: mark.shown == null ? null : String(mark.shown) })),
        { zone: numberZone, align, size, face },
      )
      setNumberResult({ signature, bytes })
      dispatch({ type: 'idle' })
    } catch (error) {
      console.error(error)
      dispatch({ type: 'fail', message: 'No pude numerar esta copia.' })
    }
  }

  function downloadNumber() {
    if (!numberReady || !numberResult || state.files.length === 0) return
    const base = fileTitle(state.files[0]?.name ?? 'documento')
    saveBytes(numberResult.bytes, `${base}-numerado.pdf`)
  }

  function downloadSplit() {
    if (state.files.length === 0 || !splitReady || !splitResult) return
    const title = fileTitle(state.files[0]?.name ?? 'documento')
    if (splitResult.files.length === 1) {
      saveBytes(splitResult.files[0].bytes, splitResult.files[0].name)
      return
    }
    saveBytes(zipStore(splitResult.files), `${title}-dividido.zip`)
  }

  function placeBand(rect: Rect | null) {
    const node = bandRef.current
    if (!node) return
    if (!rect) {
      node.style.display = 'none'
      return
    }
    node.style.display = 'block'
    node.style.left = `${rect.left}px`
    node.style.top = `${rect.top}px`
    node.style.width = `${rect.right - rect.left}px`
    node.style.height = `${rect.bottom - rect.top}px`
  }

  function cancelMarquee() {
    const drag = marqueeRef.current
    if (!drag) return
    marqueeRef.current = null
    placeBand(null)
    const main = mainRef.current
    try {
      if (main?.hasPointerCapture(drag.pointerId)) main.releasePointerCapture(drag.pointerId)
    } catch {
      // El puntero ya no está activo.
    }
    publishSelection(drag.baseIds, drag.anchorId)
  }
  cancelMarqueeRef.current = cancelMarquee

  function onShellPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    const target = event.target
    if (toolRef.current === 'unir') {
      if (!(target instanceof Element)) return
      if (target.closest('[data-id], button, a, input, textarea, select, label')) return
      dispatch({ type: 'clear-selection' })
      return
    }
    if (toolRef.current !== 'ordenar' && toolRef.current !== 'extraer') return
    if (!(target instanceof Element)) return
    if (target.closest('[data-page], button, a, input, textarea, select, label')) return
    if (pagesRef.current.length === 0) return
    event.preventDefault()
    marqueeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      baseIds: selectedRef.current.slice(),
      anchorId: anchorRef.current,
      additive: event.ctrlKey || event.metaKey || event.shiftKey,
      active: false,
    }
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Sin captura el recuadro igual sigue mientras el puntero se mueva sobre la página.
    }
  }

  function onShellPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = marqueeRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (!drag.active && Math.abs(dx) < 4 && Math.abs(dy) < 4) return
    drag.active = true
    const rect = {
      left: Math.min(drag.startX, event.clientX),
      top: Math.min(drag.startY, event.clientY),
      right: Math.max(drag.startX, event.clientX),
      bottom: Math.max(drag.startY, event.clientY),
    }
    placeBand(rect)
    const hits = idsInside(pageBoxes(pagesRef.current), rect)
    const ids = marqueeSelection(drag.baseIds, hits, drag.additive)
    publishSelection(ids, drag.additive ? drag.anchorId : (ids[0] ?? null))
  }

  function onShellPointerUp(event: PointerEvent<HTMLDivElement>) {
    const drag = marqueeRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    marqueeRef.current = null
    placeBand(null)
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    } catch {
      // El puntero ya no está activo.
    }
    if (!drag.active && !drag.additive) publishSelection([], null)
  }

  return (
    <div ref={shellRef} className="flex h-screen min-h-0 overflow-hidden">
      <div ref={bandRef} className="pointer-events-none fixed z-30 hidden border border-stamp bg-stamp/15" />
      <a
        href="#trabajo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-20 focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-white"
      >
        Saltar al contenido
      </a>
      <Sidebar tool={tool} notesOpen={notesOpen} onTool={chooseTool} onNotes={() => setNotesOpen(true)} />

      {notesOpen ? (
        <ReleaseNotesView />
      ) : (
      <>
      <main
        id="trabajo"
        ref={mainRef}
        className={`min-w-0 flex-1 px-6 ${
          splitting && state.pages.length > 0 ? 'flex min-h-0 flex-col overflow-hidden pt-6 pb-4' : 'overflow-y-auto py-6'
        }`}
        onPointerDown={onShellPointerDown}
        onPointerMove={onShellPointerMove}
        onPointerUp={onShellPointerUp}
        onPointerCancel={cancelMarquee}
        onDragOver={(event) => {
          if (tool !== 'unir' || ![...event.dataTransfer.types].includes('Files')) return
          event.preventDefault()
        }}
        onDrop={(event) => {
          if (tool !== 'unir' || event.defaultPrevented) return
          const dropped = Array.from(event.dataTransfer.files)
          if (dropped.length === 0) return
          event.preventDefault()
          void onFiles(dropped)
        }}
      >
        {tool !== 'ordenar' && tool !== 'dividir' && tool !== 'unir' && tool !== 'extraer' && tool !== 'numerar' ? (
          <ToolSoon label={toolById(tool).label} />
        ) : state.pages.length === 0 ? (
          <DropZone
            busy={state.phase === 'loading'}
            error={state.error}
            hint={
              merging
                ? 'Suelta los PDF. Aquí los ordenas enteros. En Ordenar páginas ves cada hoja.'
                : splitting
                  ? 'Abre el PDF. Luego lo partes a la mitad, en partes iguales, cada tantas páginas, o con el riel.'
                  : extracting
                    ? 'Abre el PDF. Marca las páginas con un clic o con un recuadro y expórtalas. El archivo original no cambia.'
                    : numbering
                      ? 'Abre el PDF. Eliges automático o asistido, y la descarga es una copia.'
                      : 'Vas a ver cada página. Marca una o varias, arrástralas y suéltalas en su nuevo lugar.'
            }
            heading={merging ? 'Suelta los PDF aquí' : undefined}
            onPick={() => inputRef.current?.click()}
            onFiles={(files) => void onFiles(files)}
            onExample={() =>
              void createSamplePdf().then((bytes) =>
                merging ? addDocuments([{ name: 'ejemplo.pdf', bytes }]) : loadBytes('ejemplo.pdf', bytes),
              )
            }
          />
        ) : merging ? (
          <FileDeck
            files={state.files.map((file) => ({
              id: file.id,
              name: fileTitle(file.name),
              pageCount: state.pages.filter((page) => page.fileId === file.id).length,
            }))}
            cardWidth={cardWidth}
            selectedId={selectedFileIndex >= 0 ? (state.selectedIds[0] ?? null) : null}
            onSelect={(id) => dispatch({ type: 'select', id, mode: 'replace' })}
            onReorder={reorderFiles}
          />
        ) : numbering ? (
          <NumberStage
            pages={state.pages}
            thumbs={thumbList}
            cardWidth={cardWidth}
            step={numberStep}
            mode={numberMode}
            fromPage={numberFromPage}
            startAt={numberStart}
            zone={numberZone}
            align={numberAlignNow}
            size={numberSizeNow}
            face={numberFaceNow}
            excluded={numberHidden}
            sampleId={numberSample}
            onMode={chooseNumberMode}
            onFromPage={setNumberFrom}
            onStartAt={setNumberStart}
            onZone={setNumberZone}
            onAlign={setNumberAlign}
            onSize={setNumberSize}
            onFace={setNumberFace}
            onToggle={toggleNumberPage}
            onStep={goNumberStep}
          />
        ) : splitting ? (
          <SplitStage
            pages={state.pages.map((page, index) => ({
              id: page.id,
              sourceIndex: manyFiles ? index : page.sourceIndex,
            }))}
            thumbs={thumbList}
            cuts={cutAfter}
            onCuts={publishCuts}
          />
        ) : (
          <section className="space-y-6">
            <PageGrid
              pages={state.pages}
              thumbs={manyFiles ? thumbList : (docThumbs.urls[state.files[0]?.id ?? ''] ?? [])}
              thumbAlign={manyFiles ? 'order' : 'source'}
              badges={manyFiles ? state.pages.map((page) => `pág. ${page.sourceIndex + 1}`) : undefined}
              notes={manyFiles ? state.pages.map((page) => fileNameOf.get(page.fileId) ?? '') : undefined}
              accents={manyFiles ? state.pages.map((page) => mergeTone(fileIndex.get(page.fileId) ?? 0)) : undefined}
              cardWidth={cardWidth}
              selectedIds={state.selectedIds}
              onSelect={(id, mode) => dispatch({ type: 'select', id, mode })}
              onReorder={moveDragged}
              movable={!extracting}
            />

            {!extracting && fresh && state.result ? (
              <section className="rounded-3xl border border-line bg-card p-5">
                <h3 className="font-display text-xl">Así quedó el archivo</h3>
                <p className="mt-1 text-sm text-muted">
                  Estas son las páginas del PDF nuevo, leídas otra vez desde el archivo armado.
                </p>
                {resultThumbs.error ? <p className="mt-3 text-sm text-stamp">{resultThumbs.error}</p> : null}
                <ol
                  className="mt-4 grid gap-3"
                  style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}px, 1fr))` }}
                >
                  {resultThumbs.urls.map((url, index) => (
                    <li key={`${state.result?.signature}-${index}`} className="rounded-xl border border-line p-2">
                      <div className="aspect-[3/4] overflow-hidden rounded-lg bg-[#f4efe6]">
                        {url ? (
                          <img
                            src={url}
                            alt={`Lugar ${index + 1} del archivo nuevo`}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="h-full w-full animate-pulse bg-[#efe6da]" />
                        )}
                      </div>
                      <p className="mt-1 text-center text-xs text-muted">Lugar {index + 1}</p>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </section>
        )}
      </main>
      <DetailsPanel
        tool={tool}
        fileName={state.files.length > 1 ? `${state.files.length} archivos` : (state.files[0]?.name ?? null)}
        pageCount={state.pages.length}
        byteLength={state.files.reduce((total, file) => total + file.bytes.byteLength, 0)}
        status={
          state.phase === 'loading'
            ? 'Abriendo…'
            : merging
              ? joinStatus
              : splitting
                ? splitStatus
                : extracting
                  ? extractStatus(extractPages.length, extractReady)
                  : numbering
                    ? numberStatus(numberMode, numberStep, numberFromPage, numberStart, numberFaceNow, numberReady, state.pages.length)
                    : orderStatus
        }
        error={state.error}
        thumbError={docThumbs.error}
        changed={changed}
        pages={state.pages}
        selectedIds={state.selectedIds}
        steps={state.steps}
        index={state.index}
        canMoveEarlier={canMoveEarlier}
        canMoveLater={canMoveLater}
        canUndo={canUndo}
        canRedo={canRedo}
        canPrepare={
          state.phase === 'idle' &&
          (numbering
            ? state.pages.length > 0 &&
              ((numberMode === 'automatico' && numberStep === 'config') ||
                (numberMode === 'asistido' && numberStep === 'previa'))
            : extracting
            ? extractPages.length > 0
            : merging
              ? state.files.length > 1 && state.pages.length > 0
              : splitting
                ? parts.length > 1
                : state.pages.length > 0)
        }
        canDownload={
          numbering
            ? numberReady
            : extracting
            ? extractReady
            : splitting
              ? splitReady
              : fresh && state.result !== null && (merging ? state.files.length > 1 : true)
        }
        preparing={state.phase === 'building'}
        prepareLabel={splitting ? 'Preparar los PDF' : 'Preparar PDF'}
        downloadLabel={splitting && parts.length > 1 ? 'Descargar ZIP' : 'Descargar'}
        restoreLabel={manyFiles ? 'Agrupar otra vez por archivo' : 'Restaurar orden original'}
        mergeFiles={state.files.map((file) => ({
          id: file.id,
          name: fileTitle(file.name),
          pageCount: state.pages.filter((page) => page.fileId === file.id).length,
        }))}
        onShiftMergeFile={shiftFile}
        onRemoveMergeFile={removeFile}
        splitParts={summarizeParts(splitLabels)}
        canClearCuts={cutAfter.length > 0}
        onClearCuts={() => publishCuts([])}
        onPick={() => inputRef.current?.click()}
        onMoveStart={() => (merging ? moveSelectedFile(0) : moveSelection(0))}
        onMoveBefore={() => (merging ? moveSelectedFile(selectedFileIndex - 1) : moveSelection(beforeFirst - 1))}
        onMoveAfter={() => (merging ? moveSelectedFile(selectedFileIndex + 1) : moveSelection(beforeFirst + 1))}
        onMoveEnd={() => (merging ? moveSelectedFile(state.files.length - 1) : moveSelection(stayingCount))}
        onUndo={() => dispatch({ type: 'undo' })}
        onRedo={() => dispatch({ type: 'redo' })}
        onRestore={() => dispatch({ type: 'restore' })}
        onGoto={(index) => dispatch({ type: 'goto', index })}
        onPrepare={() =>
          void (numbering ? prepareNumber() : extracting ? prepareExtract() : splitting ? prepareSplit() : prepare())
        }
        onDownload={numbering ? downloadNumber : extracting ? downloadExtract : splitting ? downloadSplit : download}
      />
      </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple={tool === 'unir'}
        className="sr-only"
        onChange={(event) => {
          const files = event.target.files ? Array.from(event.target.files) : []
          event.target.value = ''
          void onFiles(files)
        }}
      />
    </div>
  )
}

const SHEET_WIDTHS = [88, 104, 124, 148, 180, 220, 270, 340]
const SHEET_NOTCH = 100

function useSheetScale(active: boolean) {
  const mainRef = useRef<HTMLElement>(null)
  const [cardWidth, setCardWidth] = useState(148)
  const indexRef = useRef(SHEET_WIDTHS.indexOf(148))
  const accRef = useRef(0)

  useEffect(() => {
    const node = mainRef.current
    if (!node) return
    const main = node

    function onWheel(event: WheelEvent) {
      if (!event.ctrlKey) return
      event.preventDefault()
      const pixels =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? event.deltaY * 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? event.deltaY * main.clientHeight
            : event.deltaY
      accRef.current += pixels
      let index = indexRef.current
      while (accRef.current >= SHEET_NOTCH && index > 0) {
        accRef.current -= SHEET_NOTCH
        index -= 1
      }
      while (accRef.current <= -SHEET_NOTCH && index < SHEET_WIDTHS.length - 1) {
        accRef.current += SHEET_NOTCH
        index += 1
      }
      if (index === 0) accRef.current = Math.min(accRef.current, SHEET_NOTCH - 1)
      if (index === SHEET_WIDTHS.length - 1) accRef.current = Math.max(accRef.current, 1 - SHEET_NOTCH)
      if (index === indexRef.current) return
      indexRef.current = index
      setCardWidth(SHEET_WIDTHS[index] ?? 148)
    }

    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  }, [active])

  return { mainRef, cardWidth }
}

function DropZone({
  busy,
  error,
  hint,
  heading = 'Suelta un PDF aquí',
  onPick,
  onFiles,
  onExample,
}: {
  busy: boolean
  error: string | null
  hint: string
  heading?: string
  onPick: () => void
  onFiles: (files: File[]) => void
  onExample: () => void
}) {
  return (
    <div
      className="mx-auto max-w-3xl rounded-[28px] border border-dashed border-[#d9cbb8] bg-card px-6 py-16 text-center shadow-[0_20px_50px_rgba(60,40,20,0.04)]"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        onFiles(Array.from(event.dataTransfer.files))
      }}
    >
      <p className="font-display text-3xl">{heading}</p>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted">{hint}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          className="rounded-xl bg-stamp px-4 py-2.5 text-sm font-semibold text-white hover:bg-stamp-dark disabled:opacity-50"
          disabled={busy}
          onClick={onPick}
        >
          {busy ? 'Abriendo…' : 'Elegir PDF'}
        </button>
        <button
          type="button"
          className="rounded-xl border border-line bg-raise px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          disabled={busy}
          onClick={onExample}
        >
          Probar con un ejemplo
        </button>
      </div>
      {error ? <p className="mt-5 text-sm font-medium text-stamp">{error}</p> : null}
    </div>
  )
}

function ToolSoon({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-lg py-20 text-center">
      <h1 className="font-display text-4xl">{label}</h1>
      <p className="mt-3 text-sm text-muted">Esta función todavía no está disponible.</p>
    </div>
  )
}

function describeMove(group: DocPage[], place: number, files: DocFile[]) {
  if (group.length === 0 || place < 1) return 'El orden cambió.'
  if (files.length > 1) {
    if (group.length === 1) {
      const page = group[0]
      const owner = files.find((file) => file.id === page?.fileId)
      return `La página ${(page?.sourceIndex ?? 0) + 1} de ${fileTitle(owner?.name ?? 'un archivo')} quedó en el lugar ${place}.`
    }
    return `Las hojas marcadas quedaron juntas desde el lugar ${place}.`
  }
  if (group.length === 1) return `La página ${group[0].sourceIndex + 1} quedó en el lugar ${place}.`
  const labels = group.map((page) => String(page.sourceIndex + 1))
  return `Las páginas ${joinSpanish(labels)} quedaron juntas desde el lugar ${place}.`
}

function joinSpanish(items: string[]) {
  if (items.length <= 1) return items[0] ?? ''
  if (items.length === 2) return `${items[0]} y ${items[1]}`
  return `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`
}

function isPdf(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

function fileTitle(name: string) {
  return name.replace(/\.pdf$/i, '')
}

function pdfName(name: string) {
  return `${fileTitle(name)}-ordenado.pdf`
}

function makeFile(name: string, bytes: Uint8Array, count: number) {
  const id = crypto.randomUUID()
  return {
    file: { id, name, bytes },
    pages: Array.from({ length: count }, (_, sourceIndex) => ({
      id: `${id}-${sourceIndex}`,
      fileId: id,
      sourceIndex,
    })),
  }
}

function joinedName(files: { name: string }[]) {
  const base = fileTitle(files[0]?.name ?? 'documento')
  return files.length > 1 ? `${base} unido.pdf` : (files[0]?.name ?? 'documento.pdf')
}

interface SplitBundle {
  signature: string
  files: { name: string; bytes: Uint8Array }[]
}

interface ExtractBundle {
  signature: string
  bytes: Uint8Array
}

function numberKey(
  pages: { fileId: string; sourceIndex: number }[],
  mode: NumberMode | null,
  fromPage: number,
  startAt: number,
  zone: NumberZone,
  align: number,
  size: number,
  face: NumberFace,
  excluded: string[],
) {
  return [docSignature(pages), mode, fromPage, startAt, zone, align, size, face, excluded.join(',')].join('#')
}

function numberStatus(
  mode: NumberMode | null,
  step: NumberStep,
  fromPage: number,
  startAt: number,
  face: NumberFace,
  ready: boolean,
  pageCount: number,
) {
  if (pageCount === 0) return 'Abre un PDF. La descarga será una copia.'
  const exporting =
    (mode === 'automatico' && step === 'config') || (mode === 'asistido' && step === 'previa')
  if (ready && exporting) return 'La copia está lista. El original no cambia.'
  if (mode == null || step === 'modo') return 'Elige automático o asistido.'
  if (mode === 'automatico') {
    return `El número va en todas las páginas, desde la ${fromPage}, empezando en ${startAt}. Arial, 12 pt.`
  }
  if (step === 'config') return `La serie empieza en la página ${fromPage}, con el número ${startAt}.`
  if (step === 'seleccion') return 'Quita el número donde no quieras verlo. Esa página igual cuenta.'
  if (step === 'insercion') return `Acomoda el número en la cabecera, el pie o un borde. ${face}.`
  return 'Revisa los números en cada página. Luego prepara la copia.'
}

function extractStatus(count: number, ready: boolean) {
  if (ready) {
    return count === 1
      ? 'El PDF está listo. Tiene 1 página. Revísalo y descárgalo.'
      : `El PDF está listo. Tiene ${count} páginas. Revísalo y descárgalo.`
  }
  if (count === 0) return 'Marca las páginas que quieres extraer. El archivo original no cambia.'
  if (count === 1) return 'Hay 1 página marcada. Preparar arma un PDF solo con ella.'
  return `Hay ${count} páginas marcadas. Preparar arma un PDF solo con ellas, en este orden.`
}

function splitKey(pages: { fileId: string; sourceIndex: number }[], cuts: string[]) {
  return `${docSignature(pages)}|${[...cuts].sort().join('.')}`
}

function saveBytes(bytes: Uint8Array, name: string) {
  const blob = new Blob([bufferOf(bytes)], { type: name.endsWith('.zip') ? 'application/zip' : 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

interface MarqueeDrag {
  pointerId: number
  startX: number
  startY: number
  baseIds: string[]
  anchorId: string | null
  additive: boolean
  active: boolean
}

function pageBoxes(pages: { id: string }[]) {
  const found = new Map<string, HTMLElement>()
  document.querySelectorAll<HTMLElement>('[data-id]').forEach((node) => {
    const id = node.dataset.id
    if (id) found.set(id, node)
  })
  return pages.flatMap((page) => {
    const node = found.get(page.id)
    if (!node) return []
    const box = node.getBoundingClientRect()
    return [{ id: page.id, left: box.left, top: box.top, right: box.right, bottom: box.bottom }]
  })
}

function bufferOf(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}
