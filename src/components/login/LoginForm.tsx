import { Alert, Button, Checkbox, Form, Input, Popover } from 'antd'
import { User, Lock, ShieldQuestion } from 'lucide-react'
import { useLoginForm } from './hooks/useLoginForm'
import './LoginForm.css'

export function LoginForm() {
  const { username, setUsername, password, setPassword, remember, setRemember, error, submitting, handleSubmit } = useLoginForm()

  return (
    <div className="login-form-panel">
      <div className="login-form-wrap">
        <div className="login-form-mobile-logo">
          <img src="/kanvas-logo.png" alt="Kanvas" />
        </div>

        <h1 className="login-form-title">Welcome back</h1>
        <p className="login-form-subtitle">Sign in to the Super Admin panel</p>

        <Form layout="vertical" onFinish={() => void handleSubmit()} requiredMark={false}>
          <Form.Item label="Username / Email">
            <Input
              size="large"
              autoComplete="username"
              prefix={<User size={16} color="#9b87b5" />}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
          </Form.Item>

          <Form.Item label="Password">
            <Input.Password
              size="large"
              autoComplete="current-password"
              prefix={<Lock size={16} color="#9b87b5" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </Form.Item>

          <div className="d-flex align-items-center justify-content-between mb-3">
            <Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)}>
              Remember me
            </Checkbox>
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

          <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
            {submitting ? 'Signing in…' : 'Sign In'}
          </Button>
        </Form>
      </div>
    </div>
  )
}
