import { useState } from 'react'
import { Alert, Button, Form, Input, Popover, Switch } from 'antd'
import { User, Lock, ShieldQuestion, ArrowRight, TriangleAlert } from 'lucide-react'
import { useLoginForm } from './hooks/useLoginForm'
import { SplashScreen } from '../ui/SplashScreen'
import './LoginForm.css'

export function LoginForm() {
  const { username, setUsername, blurUsername, password, setPassword, remember, setRemember, error, fieldErrors, submitting, launching, handleSubmit } = useLoginForm()
  const [capsLock, setCapsLock] = useState(false)

  return (
    <>
    {launching && <SplashScreen />}
    <div className="login-form-panel">
      <div className="login-bg" aria-hidden="true">
        <span className="login-bg-orb o1" />
        <span className="login-bg-orb o2" />
        <span className="login-bg-orb o3" />
        <span className="login-bg-grid" />
        <span className="login-bg-ring r1" />
        <span className="login-bg-ring r2" />
      </div>
      <div className="login-form-wrap">
        <div className="login-form-mobile-logo">
          <img src="/kanvas-logo.png" alt="Kanvas" />
        </div>

        <h1 className="login-form-title">Welcome back</h1>
        <p className="login-form-subtitle">Sign in to manage tenants, plans and courses.</p>

        <Form layout="vertical" onFinish={() => void handleSubmit()} requiredMark={false} noValidate>
          <Form.Item label="Username / Email" validateStatus={fieldErrors.username ? 'error' : undefined} help={fieldErrors.username}>
            <Input
              size="large"
              id="username"
              name="username"
              autoComplete="username"
              prefix={<User size={16} color="#9b87b5" />}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={blurUsername}
              maxLength={100}
              status={fieldErrors.username ? 'error' : undefined}
              placeholder="Enter username"
            />
          </Form.Item>

          <Form.Item label="Password" validateStatus={fieldErrors.password ? 'error' : undefined} help={fieldErrors.password}>
            <Input.Password
              size="large"
              id="password"
              name="password"
              autoComplete="current-password"
              prefix={<Lock size={16} color="#9b87b5" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
              onKeyDown={(e) => setCapsLock(e.getModifierState('CapsLock'))}
              onBlur={() => setCapsLock(false)}
              maxLength={64}
              status={fieldErrors.password ? 'error' : undefined}
              placeholder="Enter password"
            />
          </Form.Item>
          {capsLock && (
            <p className="login-caps">
              <TriangleAlert size={13} /> Caps Lock is on
            </p>
          )}

          <div className="d-flex align-items-center justify-content-between mb-4">
            <label className="login-remember">
              <Switch size="small" checked={remember} onChange={setRemember} aria-label="Remember me" />
              Remember me
            </label>
            <Popover
              trigger="click"
              placement="bottomRight"
              title={
                <span className="d-flex align-items-center gap-2">
                  <ShieldQuestion size={14} /> Forgot your password?
                </span>
              }
              content={
                <div style={{ maxWidth: 260, fontSize: 13, color: '#3d2260' }}>
                  There's no self-service reset. Ask your organization's Super Admin to reset it for you from <strong>Platform Users → Reset password</strong> —
                  it issues a new temporary password.
                </div>
              }
            >
              <Button type="link" size="small" style={{ padding: 0 }}>
                Forgot password?
              </Button>
            </Popover>
          </div>

          {error && <Alert type="error" showIcon title={error} className="mb-3" />}

          <Button type="primary" htmlType="submit" size="large" block loading={submitting} className="login-submit">
            {submitting ? 'Signing in…' : (
              <>
                Sign In <ArrowRight size={17} className="login-arrow" />
              </>
            )}
          </Button>
        </Form>
      </div>
    </div>
    </>
  )
}
