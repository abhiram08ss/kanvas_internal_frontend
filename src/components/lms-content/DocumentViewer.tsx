import { useEffect, useRef, useState } from 'react'
import { Download, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from 'antd'
import { renderAsync } from 'docx-preview'
import * as pdfjs from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const extOf = (name: string) => name.slice(name.lastIndexOf('.')).toLowerCase()

/** The card shown for files a browser can't display itself (old .doc, PowerPoint) or when rendering failed. */
function FileCard({ url, name, note }: { url: string; name: string; note?: string }) {
  const ext = extOf(name).replace('.', '').toUpperCase().slice(0, 4) || 'FILE'
  return (
    <div className="doc-card">
      <span className="doc-card-badge">{ext}</span>
      <div className="doc-card-meta">
        <div className="doc-card-name text-truncate">{name}</div>
        <div className="doc-card-note">{note ?? 'This file type cannot be shown in the browser. Open or download it to read it.'}</div>
      </div>
      <a href={url} target="_blank" rel="noreferrer">
        <Button icon={<ExternalLink size={14} />}>Open</Button>
      </a>
      <a href={url} download>
        <Button type="primary" icon={<Download size={14} />}>
          Download
        </Button>
      </a>
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
 * Anything else (.doc, PowerPoint) gets a file card with Open / Download.
 */
export function DocumentViewer({ url, fileName }: { url: string; fileName: string }) {
  const name = fileName || url.split('/').pop() || 'Document'
  const ext = extOf(name) || extOf(url)
  const kind: 'docx' | 'pdf' | 'other' = ext === '.docx' ? 'docx' : ext === '.pdf' ? 'pdf' : 'other'
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
        else await renderAsync(buf, host.current, undefined, { className: 'docx', inWrapper: true, ignoreWidth: true, ignoreHeight: true, breakPages: false })
        if (!cancelled) setState('ready')
      })
      .catch(() => !cancelled && setState('failed'))
    return () => {
      cancelled = true
    }
  }, [url, kind])

  if (kind === 'other') return <FileCard url={url} name={name} />
  return (
    <div>
      {state === 'loading' && (
        <div className="doc-loading">
          <Loader2 size={16} className="spin" /> Loading document…
        </div>
      )}
      {state === 'failed' && <FileCard url={url} name={name} note="The document could not be shown here. Open or download it to read it." />}
      <div className={`doc-pages${state === 'ready' ? '' : ' is-hidden'}`} ref={host} />
    </div>
  )
}
