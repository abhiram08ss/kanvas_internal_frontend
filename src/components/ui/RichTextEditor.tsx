import { useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { TableKit } from '@tiptap/extension-table'
import Placeholder from '@tiptap/extension-placeholder'
import DOMPurify from 'dompurify'
import { Button, Tooltip } from 'antd'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
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
  EyeOff,
} from 'lucide-react'
import './RichTextEditor.css'

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
  children: React.ReactNode
}) {
  return (
    <Tooltip title={title}>
      <Button
        type={active ? 'primary' : 'text'}
        size="small"
        aria-label={title}
        aria-pressed={active}
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()} // keep the editor's selection/focus while clicking a toolbar button
        onClick={onClick}
        style={{ minWidth: 28, height: 28, fontWeight: 700, fontSize: 12 }}
      >
        {children}
      </Button>
    </Tooltip>
  )
}

/**
 * A compact rich-text editor (TipTap) for authoring HTML module content, with a "Preview" toggle that
 * shows the sanitized rendered output instead of the editable area - matching the underlying LMS
 * product's module editor.
 */
export function RichTextEditor({ value, onChange, placeholder }: { value: string; onChange: (html: string) => void; placeholder?: string }) {
  const [previewing, setPreviewing] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [3, 4] } }), // v3's StarterKit already includes Underline
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TableKit.configure({ table: { resizable: false } }),
      Placeholder.configure({ placeholder: placeholder ?? 'Enter content' }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { attributes: { class: 'rte-content' } },
  })

  if (!editor) return null

  const clearFormatting = () => editor.chain().focus().clearNodes().unsetAllMarks().run()
  const insertTable = () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()

  return (
    <div className={`rte-wrap ${previewing ? 'rte-previewing' : ''}`}>
      <div className="d-flex justify-content-end mb-1">
        <Button type="link" size="small" icon={previewing ? <EyeOff size={14} /> : <Eye size={14} />} onClick={() => setPreviewing((p) => !p)}>
          {previewing ? 'Edit' : 'Preview'}
        </Button>
      </div>

      {previewing ? (
        <div className="rte-content rte-preview" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value) }} />
      ) : (
        <>
          <div className="rte-toolbar">
            <ToolbarButton title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
              <Bold size={14} />
            </ToolbarButton>
            <ToolbarButton title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
              <Italic size={14} />
            </ToolbarButton>
            <ToolbarButton title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
              <UnderlineIcon size={14} />
            </ToolbarButton>
            <ToolbarButton
              title="Heading 3"
              active={editor.isActive('heading', { level: 3 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              H3
            </ToolbarButton>
            <ToolbarButton
              title="Heading 4"
              active={editor.isActive('heading', { level: 4 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
            >
              H4
            </ToolbarButton>
            <span className="rte-sep" />
            <ToolbarButton title="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
              <AlignLeft size={14} />
            </ToolbarButton>
            <ToolbarButton
              title="Align center"
              active={editor.isActive({ textAlign: 'center' })}
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
            >
              <AlignCenter size={14} />
            </ToolbarButton>
            <ToolbarButton
              title="Align right"
              active={editor.isActive({ textAlign: 'right' })}
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
            >
              <AlignRight size={14} />
            </ToolbarButton>
            <ToolbarButton
              title="Justify"
              active={editor.isActive({ textAlign: 'justify' })}
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            >
              <AlignJustify size={14} />
            </ToolbarButton>
            <span className="rte-sep" />
            <ToolbarButton title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
              <List size={14} />
            </ToolbarButton>
            <ToolbarButton title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              <ListOrdered size={14} />
            </ToolbarButton>
            <ToolbarButton title="Insert table" onClick={insertTable}>
              <TableIcon size={14} />
            </ToolbarButton>
            <ToolbarButton title="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
              <Quote size={14} />
            </ToolbarButton>
            <span className="rte-sep" />
            <ToolbarButton title="Clear formatting" onClick={clearFormatting}>
              <Eraser size={14} />
            </ToolbarButton>
          </div>
          <EditorContent editor={editor} />
        </>
      )}
    </div>
  )
}
