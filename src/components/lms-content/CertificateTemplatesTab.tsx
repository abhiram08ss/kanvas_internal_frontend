import { useMemo, useState } from 'react'
import { Award, CheckCircle2, Ban, Pencil } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { ListCard } from '../ui/ListCard'
import { DataTable } from '../ui/DataTable'
import { StatCard } from '../ui/StatCard'
import { Toolbar } from '../ui/Toolbar'
import { IconButton } from '../ui/IconButton'
import { CertificateTemplateFormModal } from './CertificateTemplateFormModal'
import { useData } from '../../context/DataContext'
import type { CertificateTemplate } from '../../api'

const statusFilters = ['All', 'Active', 'Inactive'] as const

export function CertificateTemplatesTab() {
  const { certificateTemplates, addCertificateTemplate, updateCertificateTemplate } = useData()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof statusFilters)[number]>('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CertificateTemplate | undefined>(undefined)

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
  const handleSave = (data: Parameters<typeof addCertificateTemplate>[0]) =>
    editing ? updateCertificateTemplate(editing.id, data) : addCertificateTemplate(data)
  const toggleStatus = (t: CertificateTemplate) =>
    updateCertificateTemplate(t.id, {
      status: t.status === 'Active' ? 'Inactive' : 'Active',
    })

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
          rowKey="id"
          dataSource={rows}
          locale={{ emptyText: 'No certificate templates match your search.' }}
          columns={[
            { title: 'Name', dataIndex: 'name', render: (name: string) => <span className="fw-semibold">{name}</span> },
            { title: 'Logo', dataIndex: 'logo', render: (logo: string) => <span style={{ color: '#9b87b5' }}>{logo}</span> },
            {
              title: 'Colors',
              dataIndex: 'colors',
              render: (colors: string[]) => (
                <div className="d-flex gap-1">
                  {colors.map((c, i) => (
                    <span key={i} className="rounded-1 border" style={{ width: 16, height: 16, background: c }} />
                  ))}
                </div>
              ),
            },
            {
              title: 'Signatures',
              dataIndex: 'signatures',
              render: (sigs: string[]) => <span style={{ color: '#9b87b5' }}>{sigs.length > 0 ? sigs.join(' · ') : '—'}</span>,
            },
            { title: 'Status', dataIndex: 'status', render: (status: CertificateTemplate['status']) => <Badge>{status}</Badge> },
            {
              title: 'Actions',
              key: 'actions',
              render: (_: unknown, t: CertificateTemplate) => (
                <div className="d-flex align-items-center justify-content-center gap-2">
                  <IconButton icon={<Pencil size={14} />} onClick={() => openEdit(t)} title="Edit template" tone="blue" />
                  <IconButton
                    icon={t.status === 'Active' ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                    onClick={() => void toggleStatus(t)}
                    title={t.status === 'Active' ? 'Deactivate' : 'Activate'}
                    tone={t.status === 'Active' ? 'amber' : 'green'}
                  />
                </div>
              ),
            },
          ]}
        />
      </ListCard>

      {modalOpen && <CertificateTemplateFormModal template={editing} onClose={() => setModalOpen(false)} onSave={handleSave} />}
    </div>
  )
}
