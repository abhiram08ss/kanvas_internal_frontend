import { useEffect, useState, type ReactNode } from 'react'
import { Button, Col, Input, InputNumber, Row } from 'antd'
import { confirmDialog } from '../components/ui/confirmOptions'
import { AppLayout } from '../components/layout/AppLayout'
import { Card } from '../components/ui/Card'
import { Toggle } from '../components/ui/Toggle'
import { Field } from '../components/ui/Field'
import { ErrorBlock, LoadingBlock, Notice } from '../components/ui/State'
import { api, errorMessage, type PlatformConfig, type SettingsData } from '../api'
import { useApi } from '../api/useApi'
import { useAuth } from '../context/AuthContext'

export default function Settings() {
  const { user, logout } = useAuth()
  const { data, error, loading, reload } = useApi(api.settings)
  const [form, setForm] = useState<PlatformConfig | null>(null)
  const [toggles, setToggles] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)

  const canEdit = user?.role === 'Super Admin'

  const applyServerState = (s: SettingsData) => {
    setForm(s.config)
    setToggles(Object.fromEntries(s.featureToggles.map((t) => [t.key, t.enabled])))
  }

  useEffect(() => {
    if (data) applyServerState(data)
  }, [data])

  const updateField = (key: keyof PlatformConfig, value: string | number) => setForm((f) => (f ? { ...f, [key]: value } : f))

  const save = async () => {
    if (!form || saving) return
    setSaving(true)
    setMessage(null)
    try {
      applyServerState(await api.updateSettings({ config: form, featureToggles: toggles }))
      setMessage({ tone: 'success', text: 'Settings saved.' })
    } catch (e) {
      setMessage({ tone: 'error', text: errorMessage(e) })
    } finally {
      setSaving(false)
    }
  }

  const dangerAction = (title: string, content: string, okText: string, run: () => Promise<void>, successText: string) =>
    confirmDialog({
      title,
      content,
      okText,
      okButtonProps: { danger: true },
      centered: true,
      onOk: async () => {
        setMessage(null)
        try {
          await run()
          setMessage({ tone: 'success', text: successText })
        } catch (e) {
          setMessage({ tone: 'error', text: errorMessage(e) })
        }
      },
    })

  const resetAll = () =>
    dangerAction(
      'Reset settings?',
      'Are you sure you want to reset all platform settings to factory defaults?',
      'Reset Settings',
      async () => applyServerState(await api.resetSettings()),
      'Settings reverted to defaults.',
    )

  // Flushing invalidates every token including ours, so we are signed out right after.
  const flushSessions = () =>
    dangerAction(
      'Flush sessions?',
      'Are you sure you want all admin users, including you, to sign in again?',
      'Flush Sessions',
      async () => {
        await api.flushSessions()
        logout()
      },
      'Sessions flushed.',
    )

  return (
    <AppLayout title="Settings" subtitle="Platform configuration, feature toggles, and danger zone">
      {loading && !data ? (
        <LoadingBlock />
      ) : error || !data || !form ? (
        <ErrorBlock message={error ?? 'No data'} onRetry={reload} />
      ) : (
        <>
          {message && (
            <Notice tone={message.tone} onDismiss={() => setMessage(null)}>
              {message.text}
            </Notice>
          )}
          {!canEdit && <Notice tone="error">Only a Super Admin can change platform settings — you are viewing them read-only.</Notice>}

          <Section title="Platform Configuration" first />
          <Card className="p-4">
            <Row gutter={[24, 20]}>
              <Col xs={24} sm={12}>
                <Field label="Platform Name">
                  <Input disabled={!canEdit} value={form.platformName} onChange={(e) => updateField('platformName', e.target.value)} />
                </Field>
              </Col>
              <Col xs={24} sm={12}>
                <Field label="Support Email">
                  <Input disabled={!canEdit} type="email" value={form.supportEmail} onChange={(e) => updateField('supportEmail', e.target.value)} />
                </Field>
              </Col>
              <Col xs={24} sm={12}>
                <Field label="Session Timeout (min)">
                  <InputNumber
                    disabled={!canEdit}
                    min={0}
                    style={{ width: '100%' }}
                    value={form.sessionTimeout}
                    onChange={(v) => updateField('sessionTimeout', v ?? 0)}
                  />
                </Field>
              </Col>
              <Col xs={24} sm={12}>
                <Field label="Max Login Attempts">
                  <InputNumber
                    disabled={!canEdit}
                    min={0}
                    style={{ width: '100%' }}
                    value={form.maxLoginAttempts}
                    onChange={(v) => updateField('maxLoginAttempts', v ?? 0)}
                  />
                </Field>
              </Col>
              <Col xs={24} sm={12}>
                <Field label="Default Timezone">
                  <Input disabled={!canEdit} value={form.defaultTimezone} onChange={(e) => updateField('defaultTimezone', e.target.value)} />
                </Field>
              </Col>
            </Row>
          </Card>

          <Section title="Feature Toggles" />
          <Card>
            {data.featureToggles.map((t, i) => (
              <SettingRow key={t.key} first={i === 0} title={t.name} description={t.description}>
                <Toggle checked={toggles[t.key] ?? false} disabled={!canEdit} onChange={(v) => setToggles((prev) => ({ ...prev, [t.key]: v }))} />
              </SettingRow>
            ))}
          </Card>

          {canEdit && (
            <>
              <Section title="Danger Zone" danger />
              <Card style={{ borderColor: '#fecaca' }}>
                <SettingRow first title="Reset All Platform Settings" description="Revert all settings to factory defaults">
                  <Button danger onClick={resetAll}>
                    Execute
                  </Button>
                </SettingRow>
                <SettingRow title="Flush Session Cache" description="Force all admin users to re-login">
                  <Button danger onClick={flushSessions}>
                    Execute
                  </Button>
                </SettingRow>
              </Card>

              <div className="mt-4 d-flex justify-content-end">
                <Button type="primary" size="large" loading={saving} onClick={() => void save()}>
                  {saving ? 'Saving…' : 'Save Settings'}
                </Button>
              </div>
              <p className="mt-2 text-end mb-0" style={{ fontSize: 12, color: '#9b87b5' }}>
                Changes apply immediately platform-wide
              </p>
            </>
          )}
        </>
      )}
    </AppLayout>
  )
}

function Section({ title, first, danger }: { title: string; first?: boolean; danger?: boolean }) {
  return (
    <h2 className={`mb-3 font-display fs-5 fw-bold ${first ? '' : 'mt-5'}`} style={{ color: danger ? '#dc2626' : '#1a1228' }}>
      {title}
    </h2>
  )
}

function SettingRow({ title, description, first, children }: { title: string; description: string; first?: boolean; children: ReactNode }) {
  return (
    <div className="d-flex align-items-center justify-content-between gap-3 p-4" style={first ? undefined : { borderTop: '1px solid #ede8f5' }}>
      <div>
        <p className="fw-semibold mb-0" style={{ color: '#1a1228' }}>
          {title}
        </p>
        <p className="small mb-0" style={{ color: '#7b6b94' }}>
          {description}
        </p>
      </div>
      {children}
    </div>
  )
}
