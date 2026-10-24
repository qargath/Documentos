import { useEffect, useState } from 'react'
import { loadPdf, renderThumb } from '../pdf/thumbs'

export function useThumbs(bytes: Uint8Array | null) {
  const [urls, setUrls] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!bytes) {
      setUrls([])
      setError(null)
      return
    }

    let cancelled = false
    const created: string[] = []
    const task = loadPdf(bytes)
    setUrls([])
    setError(null)

    const job = (async () => {
      const pdf = await task.promise
      const total = pdf.numPages
      if (cancelled) return
      setUrls(Array.from({ length: total }, () => ''))
      for (let page = 1; page <= total; page += 1) {
        if (cancelled) return
        const url = await renderThumb(pdf, page)
        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }
        created.push(url)
        const index = page - 1
        setUrls((current) => {
          const next = current.slice()
          next[index] = url
          return next
        })
      }
    })()

    void job.catch((cause: unknown) => {
      console.error(cause)
      if (!cancelled) setError('No pude mostrar las miniaturas.')
    })

    return () => {
      cancelled = true
      created.forEach((url) => URL.revokeObjectURL(url))
      void task.destroy()
    }
  }, [bytes])

  return { urls, error }
}
