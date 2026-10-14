import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { renderAsync } from 'docx-preview'
import { init as initPptx } from 'pptx-preview'
import * as pdfjs from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const extOf = (name: string) => name.slice(name.lastIndexOf('.')).toLowerCase()

/** The card shown for files a browser can't display itself (old .doc / .ppt) or when rendering failed. */
function FileCard({ name, note }: { name: string; note?: string }) {
  const ext = extOf(name).replace('.', '').toUpperCase().slice(0, 4) || 'FILE'
  return (
    <div className="doc-card">
      <span className="doc-card-badge">{ext}</span>
      <div className="doc-card-meta">
        <div className="doc-card-name text-truncate">{name}</div>
        <div className="doc-card-note">{note ?? 'This file type cannot be previewed in the browser.'}</div>
      </div>
    </div>
  )
}

/** Draws every page of a PDF as a canvas, scaled to the width of `host`. */
async function renderPdf(buf: ArrayBuffer, host: HTMLElement, isCancelled: () => boolean) {
  const pdf = await pdfjs.getDocument({ data: buf }).promise
  host.innerHTML = ''
  const width = Math.max(host.clientWidth - 24, 320)
  const ratio = window.devicePixelRatio || 1
  for (let n = 1; n <= pdf.numPages; n++) {
    if (isCancelled()) return
    const page = await pdf.getPage(n)
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: (width / base.width) * ratio })
    const canvas = document.createElement('canvas')
    canvas.className = 'pdf-page'
    canvas.width = viewport.width
    canvas.height = viewport.height
    canvas.style.width = `${width}px`
    canvas.style.height = `${viewport.height / ratio}px`
    host.appendChild(canvas)
    await page.render({ canvas, viewport }).promise
  }
}

/**
 * Shows a document module's file in one consistent frame: PDF and Word (.docx) pages are drawn on the page itself
 * (pdf.js and docx-preview - free, client-side, nothing leaves the browser).
 * PowerPoint (.pptx) slides are drawn by pptx-preview. Anything else (.doc, .ppt) gets a plain file card (no download or open links).
 */
export function DocumentViewer({ url, fileName }: { url: string; fileName: string }) {
  const name = fileName || url.split('/').pop() || 'Document'
  const ext = extOf(name) || extOf(url)
  const kind: 'docx' | 'pdf' | 'pptx' | 'other' = ext === '.docx' ? 'docx' : ext === '.pdf' ? 'pdf' : ext === '.pptx' ? 'pptx' : 'other'
  const host = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>(kind === 'other' ? 'failed' : 'loading')

  useEffect(() => {
    if (kind === 'other') return
    let cancelled = false
    setState('loading')
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.arrayBuffer()
      })
      .then(async (buf) => {
        if (cancelled || !host.current) return
        host.current.innerHTML = ''
        if (kind === 'pdf') await renderPdf(buf, host.current, () => cancelled)
        else if (kind === 'pptx') {
          const width = Math.max(host.current.clientWidth - 24, 320)
          await initPptx(host.current, { width, height: Math.round((width * 9) / 16), mode: 'list' }).preview(buf)
        } else await renderAsync(buf, host.current, undefined, { className: 'docx', inWrapper: true, ignoreWidth: true, ignoreHeight: true, breakPages: false })
        if (!cancelled) setState('ready')
      })
      .catch(() => !cancelled && setState('failed'))
    return () => {
      cancelled = true
    }
  }, [url, kind])

  if (kind === 'other') return <FileCard name={name} />
  return (
    <div>
      {state === 'loading' && (
        <div className="doc-loading">
          <Loader2 size={16} className="spin" /> Loading document…
        </div>
      )}
      {state === 'failed' && <FileCard name={name} note="The document could not be loaded for preview." />}
      <div className={`doc-pages${state === 'ready' ? '' : ' is-hidden'}`} ref={host} />
    </div>
  )
}
