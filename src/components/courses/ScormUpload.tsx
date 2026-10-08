import { useState } from 'react'
import { CheckCircle2, FileArchive, Loader2, Trash2, UploadCloud } from 'lucide-react'
import { Button, Upload } from 'antd'
import { api, errorMessage } from '../../api'
import { discardIfStaged } from './scormStaging'

/** What the form knows about the SCORM package that will be attached when the course is saved. */
export interface ScormSelection {
  packageId: string
  title: string
  version: string
  launchFile: string
  /** Only set for a package uploaded in this session. */
  fileName?: string
  sizeBytes?: number
}

const formatSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`)

export function ScormUpload({
  value,
  onChange,
  onBusyChange,
}: {
  value: ScormSelection | null
  onChange: (value: ScormSelection | null) => void
  onBusyChange: (busy: boolean) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    // Quick client-side checks; the server validates again (it is the one that matters).
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Only SCORM ZIP files are allowed.')
      return
    }
    setError('')
    setUploading(true)
    onBusyChange(true)
    try {
      const info = await api.uploadScorm(file)
      discardIfStaged(value) // replacing an unsaved upload: the earlier one will never be attached
      onChange({ ...info, fileName: file.name })
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setUploading(false)
      onBusyChange(false)
    }
  }

  const zipPicker = {
    accept: '.zip,application/zip',
    multiple: false,
    showUploadList: false,
    beforeUpload: (file: File) => {
      void handleFile(file)
      return false
    },
  }

  return (
    <div>
      <label className="d-block mb-1 fw-semibold" style={{ fontSize: 13, color: '#1a1228' }}>
        SCORM Package
      </label>

      {value ? (
        <div className="rounded-2 border border-success-subtle bg-success-subtle p-3">
          <div className="d-flex align-items-start gap-3">
            <CheckCircle2 size={18} className="mt-1 flex-shrink-0 text-success" />
            <div className="min-w-0 flex-grow-1 small">
              <p className="fw-semibold text-success-emphasis mb-0">SCORM package detected</p>
              {value.fileName && (
                <p className="mt-1 d-flex align-items-center gap-2 text-truncate text-secondary mb-0">
                  <FileArchive size={13} className="flex-shrink-0" /> {value.fileName}
                  {value.sizeBytes !== undefined && <span className="text-secondary">· {formatSize(value.sizeBytes)}</span>}
                </p>
              )}
              <p className="mt-1 text-secondary mb-0">
                Title: <span className="fw-medium text-dark">{value.title}</span>
              </p>
              <p className="text-secondary mb-0">
                Launch file:{' '}
                <code className="rounded bg-white px-1 text-dark" style={{ fontSize: 12 }}>
                  {value.launchFile}
                </code>
                <span className="ms-2 text-secondary" style={{ fontSize: 12 }}>
                  SCORM {value.version}
                </span>
              </p>
            </div>
            <div className="d-flex flex-shrink-0 gap-3 fw-semibold" style={{ fontSize: 12 }}>
              <Upload {...zipPicker}>
                <Button type="link" size="small" disabled={uploading}>
                  Replace
                </Button>
              </Upload>
              <Button
                type="link"
                size="small"
                danger
                icon={<Trash2 size={12} />}
                disabled={uploading}
                onClick={() => {
                  setError('')
                  discardIfStaged(value)
                  onChange(null)
                }}
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Upload.Dragger {...zipPicker} disabled={uploading}>
          {uploading ? (
            <div className="d-flex flex-column align-items-center gap-1 py-2">
              <Loader2 size={20} className="spin" color="#5c2d91" />
              <span className="small fw-semibold">Uploading and reading imsmanifest.xml�</span>
            </div>
          ) : (
            <div className="d-flex flex-column align-items-center gap-1 py-2">
              <UploadCloud size={22} color="#5c2d91" />
              <span className="small fw-semibold">Upload SCORM ZIP</span>
              <span style={{ fontSize: 12, color: '#7b6b94' }}>Click or drag a .zip file here � SCORM 1.2</span>
            </div>
          )}
        </Upload.Dragger>
      )}

      {uploading && value && (
        <p className="mt-2 d-flex align-items-center gap-2 text-secondary mb-0" style={{ fontSize: 12 }}>
          <Loader2 size={12} className="spin" /> Uploading replacement…
        </p>
      )}
      {error && <p className="mt-2 small text-danger mb-0">{error}</p>}
    </div>
  )
}
