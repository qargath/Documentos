import { useEffect, useState } from 'react'
import { loadPdf, renderThumb } from '../pdf/thumbs'

export function useMergeThumbs(files: { id: string; bytes: Uint8Array }[]) {
  const key = files.map((file) => file.id).join('\n')
  const [urls, setUrls] = useState<Record<string, string[]>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (files.length === 0) {
      setUrls({})
      setError(null)
      return
    }

    let cancelled = false
    const created: string[] = []
    const tasks = files.map((file) => ({ id: file.id, task: loadPdf(file.bytes) }))
    setError(null)

    const job = (async () => {
      const next: Record<string, string[]> = {}
      for (const item of tasks) {
        const pdf = await item.task.promise
        if (cancelled) return
        next[item.id] = Array.from({ length: pdf.numPages }, () => '')
        setUrls({ ...next })
        for (let page = 1; page <= pdf.numPages; page += 1) {
          if (cancelled) return
          const url = await renderThumb(pdf, page)
          if (cancelled) {
            URL.revokeObjectURL(url)
            return
          }
          created.push(url)
          const row = next[item.id]
          if (!row) return
          row[page - 1] = url
          setUrls({ ...next, [item.id]: row.slice() })
        }
      }
    })()

    void job.catch((cause: unknown) => {
      console.error(cause)
      if (!cancelled) setError('No pude mostrar las miniaturas.')
    })

    return () => {
      cancelled = true
      created.forEach((url) => URL.revokeObjectURL(url))
      for (const item of tasks) void item.task.destroy()
    }
    // The file list identity is the id key. Bytes stay with that id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { urls, error }
}
