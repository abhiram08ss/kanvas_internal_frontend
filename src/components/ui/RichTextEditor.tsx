import { useState, useRef, type ReactNode } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import { Node, Mark } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { TableKit } from '@tiptap/extension-table'
import Placeholder from '@tiptap/extension-placeholder'
import DOMPurify from 'dompurify'
import { App, Button, Dropdown, Input, Modal as AntModal, Popover, Slider, Tooltip } from 'antd'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  Palette,
  Code,
  Code2,
  Minus,
  Link2,
  Link2Off,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Table as TableIcon,
  Quote,
  Eraser,
  Eye,
  ImageIcon,
  Video as VideoIcon,
  FileText,
  Globe,
  Loader2,
  Trash2,
  ChevronDown,
  Plus,
  Pilcrow,
  Pencil,
} from 'lucide-react'
import { toEmbedUrl } from './embedUrl'
import './RichTextEditor.css'

/** Width (as a percentage of the content) and alignment that images and videos remember. The styling is inline so
 *  the saved HTML looks the same wherever it is shown. */
const mediaAttributes = {
  width: {
    default: 100,
    parseHTML: (el: HTMLElement) => {
      const raw = el.style.width
      const w = parseFloat(raw.startsWith('calc(') ? raw.slice(5) : raw) // inline images store "calc(50% - 6px)"
      return Number.isFinite(w) && raw.includes('%') ? Math.round(w) : 100
    },
  },
  align: { default: 'center', parseHTML: (el: HTMLElement) => el.getAttribute('data-align') ?? 'center' },
  // "Inline": the picture sits in a line with its neighbours (several pictures side by side) instead of on its own row.
  inline: { default: false, parseHTML: (el: HTMLElement) => el.getAttribute('data-inline') === 'true' },
}

const mediaStyle = (width: number, align: string, inline: boolean) =>
  inline
    ? // side-by-side pictures share one frame shape (4:3, cropped to fit) so a row always lines up, whatever the photos' own sizes
      `display:inline-block;vertical-align:top;width:calc(${width}% - 6px);max-width:100%;aspect-ratio:4/3;object-fit:cover;height:auto;border-radius:8px;margin:6px 6px 6px 0`
    : align === 'center'
      ? `display:block;width:${width}%;max-width:100%;height:auto;border-radius:8px;margin:6px auto`
      : // left / right pictures float, so a left one and a right one share a row and text wraps around them
        `display:block;float:${align};width:${width}%;max-width:100%;height:auto;border-radius:8px;margin:6px ${align === 'left' ? '12px 6px 0' : '0 6px 12px'}`

/** Images are inline: they sit in a line of text, so the cursor can be placed beside one to type, or another picture can be
 *  pasted next to it. Centre = in the line (side by side with neighbours); left / right = floated, text wraps around. */
const imageStyle = (width: number, align: string) =>
  align === 'center'
    ? `display:inline-block;vertical-align:middle;width:calc(${width}% - 12px);max-width:100%;height:auto;border-radius:8px;margin:4px 6px`
    : `float:${align};width:${width}%;max-width:100%;height:auto;border-radius:8px;margin:6px ${align === 'left' ? '12px 6px 0' : '0 6px 12px'}`

/** An <img> inside the text (inserted with "Insert > Image"); it can be resized and aligned. */
const ImageNode = Node.create({
  name: 'image',
  group: 'inline',
  inline: true,
  atom: true,
  draggable: true,
  addAttributes() {
    return { src: { default: null }, alt: { default: '' }, ...mediaAttributes }
  },
  parseHTML() {
    return [{ tag: 'img[src]' }]
  },
  renderHTML({ node }) {
    return ['img', { src: node.attrs.src, alt: node.attrs.alt, 'data-align': node.attrs.align, 'data-inline': 'true', style: imageStyle(node.attrs.width, node.attrs.align) }]
  },
})

/** A block-level <video controls> inside the content (inserted with "Insert > Video"); it can be resized and aligned. */
const VideoNode = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return { src: { default: null }, ...mediaAttributes }
  },
  parseHTML() {
    return [{ tag: 'video[src]' }]
  },
  renderHTML({ node }) {
    return ['video', { src: node.attrs.src, controls: 'true', 'data-align': node.attrs.align, 'data-inline': String(node.attrs.inline), style: mediaStyle(node.attrs.width, node.attrs.align, node.attrs.inline) }]
  },
})

/** A YouTube / Vimeo player (inserted with "Embed"). Only embed URLs built by `toEmbedUrl` ever get in here. */
const EmbedNode = Node.create({
  name: 'embed',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return { src: { default: null } }
  },
  parseHTML() {
    return [{ tag: 'iframe[src]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'iframe',
      {
        ...HTMLAttributes,
        allowfullscreen: 'true',
        allow: 'accelerometer; autoplay; encrypted-media; picture-in-picture',
        style: 'width:100%;aspect-ratio:16/9;border:0;border-radius:8px',
      },
    ]
  },
})

/** An attached document (PDF / Word / PowerPoint) shown as a clickable file card. The styling is inline so the card
 *  looks the same wherever the saved HTML is shown (editor, preview, learner view). */
const DocumentNode = Node.create({
  name: 'document',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return { href: { default: null }, name: { default: 'Document' } }
  },
  parseHTML() {
    return [
      {
        tag: 'a.rte-doc',
        getAttrs: (el) => ({ href: (el as HTMLElement).getAttribute('href'), name: (el as HTMLElement).getAttribute('data-name') ?? 'Document' }),
      },
    ]
  },
  renderHTML({ node }) {
    const name = String(node.attrs.name ?? 'Document')
    const ext = (name.split('.').pop() ?? 'file').slice(0, 4).toUpperCase()
    return [
      'a',
      {
        class: 'rte-doc',
        href: node.attrs.href,
        target: '_blank',
        rel: 'noopener noreferrer',
        'data-name': name,
        style:
          'display:flex;align-items:center;gap:12px;padding:12px 14px;margin:8px 0;border:1px solid #e2d9f0;border-radius:12px;background:#faf8fd;color:#1a1228;text-decoration:none',
      },
      [
        'span',
        { style: 'flex:none;width:42px;height:42px;border-radius:10px;background:#5c2d91;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center' },
        ext,
      ],
      ['span', { style: 'flex:1;min-width:0;font-weight:600;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, name],
      ['span', { style: 'flex:none;font-size:12px;font-weight:700;color:#5c2d91' }, 'Open ↗'],
    ]
  },
})

/** Yellow marker pen. */
const Highlight = Mark.create({
  name: 'highlight',
  parseHTML() {
    return [{ tag: 'mark' }]
  },
  renderHTML() {
    return ['mark', { style: 'background:#fff3a3;padding:0 2px;border-radius:3px' }, 0]
  },
})

/** Coloured text. */
const TextColor = Mark.create({
  name: 'textColor',
  addAttributes() {
    return { color: { default: null } }
  },
  parseHTML() {
    return [
      {
        tag: 'span[style]',
        getAttrs: (el) => {
          const color = (el as HTMLElement).style.color
          return color ? { color } : false
        },
      },
    ]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', { style: `color:${HTMLAttributes.color}` }, 0]
  },
})

const COLORS = ['#1a1228', '#5c2d91', '#2563eb', '#16a34a', '#d97706', '#dc2626', '#64748b']

function ToolbarButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  title: string
  children: ReactNode
}) {
  return (
    <Tooltip title={title}>
      <button
        type="button"
        className={`rte-tb${active ? ' is-active' : ''}`}
        aria-label={title}
        aria-pressed={active}
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()} // keep the editor's selection/focus while clicking a toolbar button
        onClick={onClick}
      >
        {children}
      </button>
    </Tooltip>
  )
}

/** A toolbar button that opens a small panel with one text field (used for links and video URLs). */
function UrlPopover({
  icon,
  title,
  placeholder,
  action,
  active,
  initial,
  onSubmit,
}: {
  icon: ReactNode
  title: string
  placeholder: string
  action: string
  active?: boolean
  initial?: string
  onSubmit: (url: string) => string | null // returns an error message, or null when it worked
}) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  const submit = () => {
    const err = onSubmit(url.trim())
    if (err) setError(err)
    else {
      setOpen(false)
      setUrl('')
      setError('')
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) {
          setUrl(initial ?? '')
          setError('')
        }
      }}
      trigger="click"
      placement="bottomLeft"
      content={
        <div style={{ width: 280 }}>
          <Input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} onPressEnter={submit} placeholder={placeholder} status={error ? 'error' : undefined} />
          {error && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>{error}</div>}
          <div className="d-flex justify-content-end gap-2 mt-2">
            <Button size="small" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="small" type="primary" onClick={submit}>
              {action}
            </Button>
          </div>
        </div>
      }
    >
      <span>
        <ToolbarButton title={title} active={active} onClick={() => undefined}>
          {icon}
        </ToolbarButton>
      </span>
    </Popover>
  )
}

/** Appears under the toolbar while an image or video is selected: width slider, size presets, alignment, reset. */
function MediaTools({ editor, kind }: { editor: Editor; kind: 'image' | 'video' }) {
  const attrs = editor.getAttributes(kind) as { width?: number; align?: string; inline?: boolean }
  const width = attrs.width ?? 100
  const align = attrs.align ?? 'center'
  const inline = attrs.inline ?? false
  const set = (patch: { width?: number; align?: string; inline?: boolean }) => editor.chain().focus().updateAttributes(kind, patch).run()
  return (
    <div className="rte-media-tools">
      <span className="rte-table-label">{kind === 'image' ? 'Selected image' : 'Selected video'}</span>
      <span className="rte-media-field">Width</span>
      <Slider className="rte-media-slider" min={10} max={100} value={width} onChange={(v) => set({ width: v })} tooltip={{ formatter: (v) => `${v}%` }} />
      <span className="rte-media-pct">{width}%</span>
      {[25, 50, 75, 100].map((w) => (
        <button key={w} type="button" className={width === w ? 'is-on' : ''} onMouseDown={(e) => e.preventDefault()} onClick={() => set({ width: w })}>
          {w}%
        </button>
      ))}
      <span className="rte-sep" />
      {(
        [
          ['left', AlignLeft, 'Align left'],
          ['center', AlignCenter, 'Center'],
          ['right', AlignRight, 'Align right'],
        ] as const
      ).map(([key, Icon, label]) => (
        <button key={key} type="button" aria-label={label} title={label} className={align === key ? 'is-on' : ''} onMouseDown={(e) => e.preventDefault()} onClick={() => set({ align: key })}>
          <Icon size={13} />
        </button>
      ))}
      {kind === 'video' && (
        <button type="button" className={inline ? 'is-on' : ''} title="Put videos side by side in one line" onMouseDown={(e) => e.preventDefault()} onClick={() => set({ inline: !inline })}>
          Inline
        </button>
      )}
      <span className="rte-sep" />
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => set({ width: 100, align: 'center', inline: false })}>
        Reset
      </button>
    </div>
  )
}

function TableTools({ editor }: { editor: Editor }) {
  return (
    <div className="rte-table-tools">
      <span className="rte-table-label">Table</span>
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().addRowAfter().run()}>
        + Row
      </button>
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().addColumnAfter().run()}>
        + Column
      </button>
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().deleteRow().run()}>
        − Row
      </button>
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().deleteColumn().run()}>
        − Column
      </button>
      <button type="button" className="is-danger" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().deleteTable().run()}>
        <Trash2 size={12} /> Delete table
      </button>
    </div>
  )
}

/**
 * The rich-text editor (TipTap, free / MIT) for authoring HTML module content: text formatting (bold, italic,
 * underline, strike, highlight, colour, code), headings, alignment, lists, quotes, code blocks, dividers, links,
 * tables (with row/column tools), undo/redo, a live word count, and a "Preview" toggle that shows the sanitized
 * rendered output. When `onUploadMedia` is given it also offers Insert Image / Video / Document uploads and
 * an Embed button for YouTube / Vimeo links.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  onUploadMedia,
  allowDocuments = true,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  /** When given, the toolbar gets "Insert Image / Video / Document" buttons: the file is uploaded through this and
   *  the returned URL is placed in the content. */
  onUploadMedia?: (file: File, kind: 'image' | 'video' | 'document') => Promise<string>
  /** Whether PDF / Word / PowerPoint files can be added (Insert menu, drop and paste). Default true. */
  allowDocuments?: boolean
}) {
  const [previewing, setPreviewing] = useState(false)
  const [embedOpen, setEmbedOpen] = useState(false)
  const [uploading, setUploading] = useState<'image' | 'video' | 'document' | null>(null)
  const imageInput = useRef<HTMLInputElement>(null)
  const videoInput = useRef<HTMLInputElement>(null)
  const docInput = useRef<HTMLInputElement>(null)
  const { message } = App.useApp()
  const [dropping, setDropping] = useState(false)
  // The editor is created once, so its drop / paste hooks reach the latest upload code through this ref.
  const filesHandler = useRef<((files: File[], pos?: number) => void) | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false, autolink: true } }), // v3's StarterKit already has Underline, Link, Strike, Code, CodeBlock, HorizontalRule, undo/redo
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TableKit.configure({ table: { resizable: false } }),
      Placeholder.configure({ placeholder: placeholder ?? 'Enter content' }),
      ImageNode,
      VideoNode,
      EmbedNode,
      DocumentNode,
      Highlight,
      TextColor,
    ],
    content: value,
    // The toolbar reads the selection (active buttons, heading label, image / table panels), so it must re-render on every change.
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: 'rte-content' },
      // Files dropped onto the editor (from the desktop / file manager) are uploaded and placed where they were dropped.
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false // pictures already in the text are moved by the editor itself
        const files = Array.from(event.dataTransfer?.files ?? [])
        if (files.length === 0 || !filesHandler.current) return false
        event.preventDefault()
        filesHandler.current(files, view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos)
        return true
      },
      // Pasted pictures (e.g. a screenshot) are uploaded too.
      handlePaste: (_view, event) => {
        const data = event.clipboardData
        // Copying text from a web page or Word also puts a picture of it on the clipboard. Whenever there is text, paste just
        // the text; only a clipboard with nothing but a picture (a screenshot) is uploaded as an image.
        const hasText = !!data && (data.types.includes('text/html') || data.types.includes('text/plain')) && !!(data.getData('text/plain') || data.getData('text/html'))
        const files = Array.from(data?.files ?? [])
        if (hasText || files.length === 0 || !filesHandler.current) return false
        event.preventDefault()
        filesHandler.current(files)
        return true
      },
      // Text pasted from elsewhere never brings its pictures along (they arrive as huge inline binary data); pictures
      // are added on purpose with Insert, drag and drop, or a screenshot paste.
      transformPastedHTML: (html) =>
        html
          .replace(/<img\b[^>]*>/gi, '')
          .replace(/<(video|iframe|object|embed)\b[\s\S]*?<\/\1>/gi, ''),
    },
  })

  if (!editor) return null

  const clearFormatting = () => editor.chain().focus().clearNodes().unsetAllMarks().run()
  const insertTable = () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()

  const text = editor.getText().trim()
  const words = text ? text.split(/\s+/).length : 0

  const setLink = (url: string): string | null => {
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return null
    }
    const href = /^(https?:|mailto:|\/)/i.test(url) ? url : `https://${url}`
    editor.chain().focus().extendMarkRange('link').setLink({ href, target: '_blank', rel: 'noopener noreferrer' }).run()
    return null
  }

  const embed = (url: string): string | null => {
    const src = toEmbedUrl(url)
    if (!src) return 'Paste a YouTube or Vimeo link.'
    const { to } = editor.state.selection
    editor
      .chain()
      .focus()
      .insertContentAt(to, [{ type: 'embed', attrs: { src } }, { type: 'paragraph' }])
      .run()
    return null
  }

  // Files come from the Insert menu or from a drop / paste. Several can arrive at once: they are uploaded in parallel,
  // sorted into image / video / document by type, and inserted in the order they were given.
  const kindOf = (file: File): 'image' | 'video' | 'document' | null => {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type.startsWith('video/')) return 'video'
    return allowDocuments && /\.(pdf|docx?|pptx?)$/i.test(file.name) ? 'document' : null
  }

  const uploadFiles = async (files: File[], pos?: number) => {
    if (files.length === 0 || !onUploadMedia) return
    const accepted = files.map((file) => ({ file, kind: kindOf(file) })).filter((f): f is { file: File; kind: 'image' | 'video' | 'document' } => f.kind !== null)
    const skipped = files.length - accepted.length
    if (skipped > 0) void message.warning(`${skipped} file${skipped === 1 ? ' was' : 's were'} skipped: ${allowDocuments ? 'only images, videos, PDF, Word and PowerPoint files can be added.' : 'only images and videos can be added.'}`)
    if (accepted.length === 0) return
    setUploading(accepted[0].kind)
    const results = await Promise.allSettled(accepted.map(({ file, kind }) => onUploadMedia(file, kind)))
    const uploaded = results.flatMap((r, i) => (r.status === 'fulfilled' ? [{ src: r.value, name: accepted[i].file.name, kind: accepted[i].kind }] : []))
    const failed = results.length - uploaded.length
    const images = uploaded.filter((u) => u.kind === 'image').length
    if (uploaded.length > 0) {
      const at = pos ?? editor.state.selection.to
      // Pictures are inline: with the cursor in a line of text (or just after a picture) they go right beside it. Several
      // pictures added together share the line (2 -> halves, 3 -> thirds, 4+ -> quarters); one picture takes half the
      // width so there is room beside it. Videos and documents are blocks and go below the line.
      const imageNodes = uploaded
        .filter((u) => u.kind === 'image')
        .map(({ src }) => ({ type: 'image', attrs: { src, width: images > 1 ? (images === 2 ? 48 : images === 3 ? 32 : 24) : 50 } }))
      const blockNodes = uploaded
        .filter((u) => u.kind !== 'image')
        .map(({ src, name, kind }) => (kind === 'document' ? { type: 'document', attrs: { href: src, name } } : { type: kind, attrs: { src } }))
      const inLine = editor.state.doc.resolve(Math.min(at, editor.state.doc.content.size)).parent.isTextblock
      const chain = editor.chain().focus()
      if (inLine) {
        if (imageNodes.length) chain.insertContentAt(at, imageNodes)
        chain.run()
        if (blockNodes.length) {
          const end = editor.state.selection.$to.after()
          editor.chain().focus().insertContentAt(end, [...blockNodes, { type: 'paragraph' }]).run()
        }
      } else {
        chain
          .insertContentAt(at, [...(imageNodes.length ? [{ type: 'paragraph', content: imageNodes }] : []), ...blockNodes, { type: 'paragraph' }])
          .run()
      }
    }
    if (failed > 0) {
      const firstError = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined
      const reason = firstError?.reason instanceof Error ? ` ${firstError.reason.message}` : ''
      void message.error(`${failed} of ${results.length} file${results.length === 1 ? '' : 's'} could not be uploaded.${reason}`)
    }
    setUploading(null)
  }
  filesHandler.current = (files, pos) => void uploadFiles(files, pos)
  const handleMedia = (files: FileList | null) => void uploadFiles(files ? Array.from(files) : [])

  const currentLink = (editor.getAttributes('link').href as string | undefined) ?? ''
  const headingLevel = [2, 3, 4].find((l) => editor.isActive('heading', { level: l }))
  const styleLabel = headingLevel ? `Heading ${headingLevel}` : 'Paragraph'
  const alignment = (['center', 'right', 'justify'] as const).find((al) => editor.isActive({ textAlign: al })) ?? 'left'
  const AlignIcon = { left: AlignLeft, center: AlignCenter, right: AlignRight, justify: AlignJustify }[alignment]
  const busyIcon = (kind: 'image' | 'video' | 'document', icon: ReactNode) => (uploading === kind ? <Loader2 size={14} className="spin" /> : icon)

  return (
    <div
      className={`rte-wrap ${previewing ? 'rte-previewing' : ''}${dropping ? ' is-dropping' : ''}`}
      onDragOver={(e) => {
        if (onUploadMedia && !previewing && e.dataTransfer?.types.includes('Files')) setDropping(true)
      }}
      onDragLeave={(e) => {
        const to = e.relatedTarget as HTMLElement | null
        if (!to || !e.currentTarget.contains(to)) setDropping(false)
      }}
      onDrop={() => setDropping(false)}
    >
      {dropping && <div className="rte-drop-hint">{allowDocuments ? 'Drop images, videos or documents here to add them' : 'Drop images or videos here to add them'}</div>}
      <div className="rte-toolbar">
        {!previewing && (
          <>
            <div className="rte-group">
              <ToolbarButton title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
                <Undo2 size={15} />
              </ToolbarButton>
              <ToolbarButton title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
                <Redo2 size={15} />
              </ToolbarButton>
            </div>

            <div className="rte-group">
              <Dropdown
                trigger={['click']}
                menu={{
                  selectedKeys: [headingLevel ? String(headingLevel) : 'p'],
                  items: [
                    { key: 'p', label: 'Paragraph' },
                    { key: '2', label: <span className="rte-menu-h2">Heading 2</span> },
                    { key: '3', label: <span className="rte-menu-h3">Heading 3</span> },
                    { key: '4', label: <span className="rte-menu-h4">Heading 4</span> },
                  ],
                  onClick: ({ key }) => {
                    const chain = editor.chain().focus()
                    if (key === 'p') chain.setParagraph().run()
                    else chain.setHeading({ level: Number(key) as 2 | 3 | 4 }).run()
                  },
                }}
              >
                <button type="button" className="rte-select" onMouseDown={(e) => e.preventDefault()}>
                  <Pilcrow size={14} />
                  <span>{styleLabel}</span>
                  <ChevronDown size={13} />
                </button>
              </Dropdown>
            </div>

            <div className="rte-group">
              <ToolbarButton title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
                <Bold size={15} />
              </ToolbarButton>
              <ToolbarButton title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
                <Italic size={15} />
              </ToolbarButton>
              <ToolbarButton title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
                <UnderlineIcon size={15} />
              </ToolbarButton>
              <ToolbarButton title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
                <Strikethrough size={15} />
              </ToolbarButton>
              <ToolbarButton title="Highlight" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleMark('highlight').run()}>
                <Highlighter size={15} />
              </ToolbarButton>
              <Popover
                trigger="click"
                placement="bottomLeft"
                content={
                  <div className="rte-colors">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Text colour ${c}`}
                        className="rte-swatch"
                        style={{ background: c }}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => editor.chain().focus().setMark('textColor', { color: c }).run()}
                      />
                    ))}
                    <button type="button" className="rte-swatch-reset" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().unsetMark('textColor').run()}>
                      Reset
                    </button>
                  </div>
                }
              >
                <span>
                  <ToolbarButton title="Text colour" active={editor.isActive('textColor')} onClick={() => undefined}>
                    <Palette size={15} />
                  </ToolbarButton>
                </span>
              </Popover>
              <ToolbarButton title="Inline code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
                <Code size={15} />
              </ToolbarButton>
            </div>

            <div className="rte-group">
              <Dropdown
                trigger={['click']}
                menu={{
                  selectedKeys: [alignment],
                  items: [
                    { key: 'left', icon: <AlignLeft size={14} />, label: 'Align left' },
                    { key: 'center', icon: <AlignCenter size={14} />, label: 'Align center' },
                    { key: 'right', icon: <AlignRight size={14} />, label: 'Align right' },
                    { key: 'justify', icon: <AlignJustify size={14} />, label: 'Justify' },
                  ],
                  onClick: ({ key }) => editor.chain().focus().setTextAlign(key).run(),
                }}
              >
                <button type="button" className="rte-select rte-select-icon" aria-label="Text alignment" onMouseDown={(e) => e.preventDefault()}>
                  <AlignIcon size={15} />
                  <ChevronDown size={13} />
                </button>
              </Dropdown>
              <ToolbarButton title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
                <List size={15} />
              </ToolbarButton>
              <ToolbarButton title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                <ListOrdered size={15} />
              </ToolbarButton>
              <ToolbarButton title="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                <Quote size={15} />
              </ToolbarButton>
            </div>

            <div className="rte-group">
              <UrlPopover
                icon={<Link2 size={15} />}
                title="Add link"
                placeholder="https://example.com (empty removes the link)"
                action="Apply"
                active={editor.isActive('link')}
                initial={currentLink}
                onSubmit={setLink}
              />
              <ToolbarButton title="Remove link" disabled={!editor.isActive('link')} onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}>
                <Link2Off size={15} />
              </ToolbarButton>
              <ToolbarButton title="Insert table" onClick={insertTable}>
                <TableIcon size={15} />
              </ToolbarButton>
              <ToolbarButton title="Code block" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
                <Code2 size={15} />
              </ToolbarButton>
              <ToolbarButton title="Divider line" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
                <Minus size={15} />
              </ToolbarButton>
              <ToolbarButton title="Clear formatting" onClick={clearFormatting}>
                <Eraser size={15} />
              </ToolbarButton>
            </div>

            {onUploadMedia && (
              <Dropdown
                trigger={['click']}
                menu={{
                  items: [
                    { key: 'image', icon: busyIcon('image', <ImageIcon size={14} />), label: 'Image' },
                    { key: 'video', icon: busyIcon('video', <VideoIcon size={14} />), label: 'Video' },
                    ...(allowDocuments ? [{ key: 'document', icon: busyIcon('document', <FileText size={14} />), label: 'Document (PDF, Word, PowerPoint)' }] : []),
                    { type: 'divider' },
                    { key: 'embed', icon: <Globe size={14} />, label: 'Embed YouTube / Vimeo link' },
                  ],
                  onClick: ({ key }) => {
                    if (key === 'image') imageInput.current?.click()
                    else if (key === 'video') videoInput.current?.click()
                    else if (key === 'document') docInput.current?.click()
                    else setEmbedOpen(true)
                  },
                }}
              >
                <button type="button" className="rte-insert" disabled={uploading !== null} onMouseDown={(e) => e.preventDefault()}>
                  {uploading ? <Loader2 size={14} className="spin" /> : <Plus size={14} strokeWidth={2.5} />}
                  <span>Insert</span>
                  <ChevronDown size={13} />
                </button>
              </Dropdown>
            )}
          </>
        )}

        <div className="rte-mode">
          <button type="button" aria-pressed={previewing} className={previewing ? 'is-on' : ''} onClick={() => setPreviewing((p) => !p)}>
            {previewing ? <Pencil size={13} /> : <Eye size={13} />} {previewing ? 'Edit' : 'Preview'}
          </button>
        </div>
      </div>

      {onUploadMedia && (
        <>
          <input ref={imageInput} type="file" accept="image/*" multiple hidden onChange={(e) => { handleMedia(e.target.files); e.target.value = '' }} />
          <input ref={videoInput} type="file" accept="video/*" multiple hidden onChange={(e) => { handleMedia(e.target.files); e.target.value = '' }} />
          {allowDocuments && <input ref={docInput} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" multiple hidden onChange={(e) => { handleMedia(e.target.files); e.target.value = '' }} />}
          <AntModal open={embedOpen} onCancel={() => setEmbedOpen(false)} footer={null} title="Embed a video" width={420} centered destroyOnHidden>
            <EmbedPanel
              onSubmit={(url) => {
                const err = embed(url)
                if (!err) setEmbedOpen(false)
                return err
              }}
            />
          </AntModal>
        </>
      )}

      {!previewing && editor.isActive('table') && <TableTools editor={editor} />}
      {!previewing && editor.isActive('image') && <MediaTools editor={editor} kind="image" />}
      {!previewing && editor.isActive('video') && <MediaTools editor={editor} kind="video" />}

      {previewing ? (
        <div
          className="rte-content rte-preview"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(value, { ADD_TAGS: ['iframe'], ADD_ATTR: ['allowfullscreen', 'allow', 'target'] }),
          }}
        />
      ) : (
        <EditorContent editor={editor} />
      )}

      <div className="rte-status">
        <span>
          {words} {words === 1 ? 'word' : 'words'} · {text.length} characters
        </span>
        {uploading && <span className="rte-status-busy">Uploading {uploading}…</span>}
      </div>
    </div>
  )
}

/** The little panel behind the "Embed YouTube / Vimeo" button. */
function EmbedPanel({ onSubmit }: { onSubmit: (url: string) => string | null }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const submit = () => {
    const err = onSubmit(url.trim())
    if (err) setError(err)
    else {
      setUrl('')
      setError('')
    }
  }
  return (
    <div>
      <Input autoFocus size="large" value={url} onChange={(e) => setUrl(e.target.value)} onPressEnter={submit} placeholder="Paste a YouTube or Vimeo link" status={error ? 'error' : undefined} />
      {error && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>{error}</div>}
      <div className="d-flex justify-content-end mt-3">
        <Button type="primary" onClick={submit}>
          Embed
        </Button>
      </div>
    </div>
  )
}
