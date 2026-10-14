import { useMemo, useState } from 'react'
import { App } from 'antd'
import { reasonDialog } from '../ui/reasonDialog'
import { confirmDialog } from '../ui/confirmOptions'
import { Award, CheckCircle2, Ban, Eye, Pencil } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { ListCard } from '../ui/ListCard'
import { DataTable } from '../ui/DataTable'
import { StatCard } from '../ui/StatCard'
import { Toolbar } from '../ui/Toolbar'
import { IconButton } from '../ui/IconButton'
import { isLogoImage, logoImageUrl, resolveLogo, useDefaultLogo } from './logoImage'
import { CertificateTemplateFormModal } from './CertificateTemplateFormModal'
import { CertificateTemplatePreviewModal } from './CertificateTemplatePreviewModal'
import { useData } from '../../context/DataContext'
import { errorMessage, type CertificateTemplate } from '../../api'

const statusFilters = ['All', 'Active', 'Inactive'] as const

export function CertificateTemplatesTab() {
  const { certificateTemplates, addCertificateTemplate, updateCertificateTemplate } = useData()
  const { defaultLogo } = useDefaultLogo()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof statusFilters)[number]>('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CertificateTemplate | undefined>(undefined)
  const [previewing, setPreviewing] = useState<CertificateTemplate | null>(null)

  const rows = useMemo(
    () =>
      certificateTemplates.filter((t) => {
        const matchesQuery = t.name.toLowerCase().includes(query.toLowerCase())
        const matchesFilter = filter === 'All' || t.status === filter
        return matchesQuery && matchesFilter
      }),
    [certificateTemplates, query, filter],
  )

  const openCreate = () => {
    setEditing(undefined)
    setModalOpen(true)
  }
  const openEdit = (t: CertificateTemplate) => {
    setEditing(t)
    setModalOpen(true)
  }
  const { notification } = App.useApp()
  const handleSave = async (data: Parameters<typeof addCertificateTemplate>[0]) => {
    if (editing) await updateCertificateTemplate(editing.id, data)
    else await addCertificateTemplate(data)
    notification.success({ title: editing ? 'Template updated' : 'Template created', description: data.name })
  }
  const toggleStatus = async (t: CertificateTemplate, reason?: string) => {
    const next = t.status === 'Active' ? 'Inactive' : 'Active'
    try {
      await updateCertificateTemplate(t.id, { status: next, ...(reason ? { reason } : {}) })
      notification.success({ title: next === 'Active' ? 'Template re-activated' : 'Template deactivated', description: t.name })
    } catch (e) {
      notification.error({ title: 'Action failed', description: `${t.name}: ${errorMessage(e)}` })
    }
  }
  const confirmToggle = (t: CertificateTemplate) => {
    if (t.status === 'Active') {
      reasonDialog({
        title: 'Deactivate template?',
        content: `Are you sure you want to deactivate ${t.name}?`,
        okText: 'Deactivate Template',
        onOk: (reason) => toggleStatus(t, reason),
      })
      return
    }
    confirmDialog({
      title: 'Re-activate template?',
      content: `Are you sure you want to re-activate ${t.name}?`,
      okText: 'Re-activate Template',
      onOk: () => toggleStatus(t),
    })
  }

  return (
    <div>
      <div className="row row-cols-2 row-cols-lg-3 g-3 mb-4">
        <div className="col">
          <StatCard icon={<Award size={20} />} label="Total Templates" value={certificateTemplates.length} tone="purple" />
        </div>
        <div className="col">
          <StatCard icon={<CheckCircle2 size={20} />} label="Active" value={certificateTemplates.filter((t) => t.status === 'Active').length} tone="green" />
        </div>
        <div className="col">
          <StatCard icon={<Ban size={20} />} label="Inactive" value={certificateTemplates.filter((t) => t.status === 'Inactive').length} tone="slate" />
        </div>
      </div>

      <ListCard>
        <Toolbar
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder="Search templates..."
          filters={statusFilters}
          activeFilter={filter}
          onFilterChange={setFilter}
          newLabel="New Template"
          onNew={openCreate}
        />
        <DataTable<CertificateTemplate>
          serial={false}
          rowKey="id"
          dataSource={rows}
          locale={{ emptyText: 'No certificate templates match your search.' }}
          columns={[
            { title: 'Name', dataIndex: 'name', render: (name: string) => <span className="fw-semibold">{name}</span> },
            {
              title: 'Logo', width: 200,
              dataIndex: 'logo',
              render: (raw: string) => {
                const logo = resolveLogo(raw, defaultLogo)
                return isLogoImage(logo) ? (
                  <img src={logoImageUrl(logo)} alt="Logo" style={{ height: 28, maxWidth: 140, objectFit: 'contain' }} />
                ) : (
                  <span className="d-inline-flex align-items-center gap-2" style={{ color: '#3d3450' }}>
                    <Award size={15} style={{ color: '#7c3fc0' }} />
                    {logo}
                  </span>
                )
              },
            },
            {
              title: 'Colors', width: 170,
              dataIndex: 'colors',
              render: (colors: string[]) => (
                <div className="d-flex align-items-center gap-2">
                  {colors.map((c, i) => (
                    <span
                      key={i}
                      title={c}
                      className="rounded-circle"
                      style={{ width: 22, height: 22, background: c, border: '2px solid #fff', boxShadow: '0 0 0 1px #e2dcee' }}
                    />
                  ))}
                </div>
              ),
            },
            {
              title: 'Signatures', width: 320,
              dataIndex: 'signatures',
              render: (sigs: string[]) =>
                sigs.length > 0 ? (
                  <div className="d-flex flex-wrap gap-1">
                    {sigs.map((sg) => (
                      <Badge key={sg} tone="slate">{sg}</Badge>
                    ))}
                  </div>
                ) : (
                  <span className="tenant-muted">—</span>
                ),
            },
            { title: 'Status', width: 130, dataIndex: 'status', render: (status: CertificateTemplate['status']) => <Badge>{status}</Badge> },
            {
              title: 'Actions', width: 140,
              key: 'actions',
              render: (_: unknown, t: CertificateTemplate) => (
                <div className="d-flex align-items-center gap-2">
                  <IconButton icon={<Pencil size={14} />} onClick={() => openEdit(t)} title="Edit template" tone="blue" />
                  <IconButton icon={<Eye size={14} />} onClick={() => setPreviewing(t)} title="Preview certificate" tone="purple" />
                  <IconButton
                    icon={t.status === 'Active' ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                    onClick={() => confirmToggle(t)}
                    title={t.status === 'Active' ? 'Deactivate' : 'Re-activate'}
                    tone={t.status === 'Active' ? 'amber' : 'green'}
                  />
                </div>
              ),
            },
          ]}
        />
      </ListCard>

      {previewing && <CertificateTemplatePreviewModal template={previewing} onClose={() => setPreviewing(null)} />}
      {modalOpen && <CertificateTemplateFormModal template={editing} onClose={() => setModalOpen(false)} onSave={handleSave} />}
    </div>
  )
}
