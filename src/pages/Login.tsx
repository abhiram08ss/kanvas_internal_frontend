import { LoginHero } from '../components/login/LoginHero'
import { LoginForm } from '../components/login/LoginForm'

export default function Login() {
  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <LoginHero />
      <LoginForm />
    </div>
  )
}
