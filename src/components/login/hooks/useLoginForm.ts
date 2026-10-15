import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { stripSpaces, validateLoginPassword, validateLoginUsername } from '../../../utils/validation'

const REMEMBER_KEY = 'kanvas-remembered-user'

const readRemembered = () => {
  try {
    return localStorage.getItem(REMEMBER_KEY) ?? ''
  } catch {
    return ''
  }
}

/** Hands the credentials to the browser's own password manager (never stored by the app), so it can suggest them next time. */
const saveToBrowser = async (username: string, password: string) => {
  try {
    const Cred = (window as unknown as { PasswordCredential?: new (init: { id: string; password: string; name?: string }) => Credential }).PasswordCredential
    if (Cred && navigator.credentials) await navigator.credentials.store(new Cred({ id: username, password, name: username }))
  } catch {
    /* unsupported or blocked: the browser's normal save prompt still applies */
  }
}

type PasswordCredentialLike = Credential & { id: string; password?: string }

/** Asks the browser's password manager for the credentials saved by an earlier "Remember me" sign-in. */
const readFromBrowser = async (): Promise<{ username: string; password: string } | null> => {
  try {
    if (!navigator.credentials) return null
    const cred = (await navigator.credentials.get({ password: true, mediation: 'optional' } as CredentialRequestOptions)) as PasswordCredentialLike | null
    return cred && cred.password ? { username: cred.id, password: cred.password } : null
  } catch {
    return null
  }
}

/**
 * Owns the login form's fields and submit flow. Validates each field (inline messages), "Remember me" keeps the
 * session across browser restarts, pre-fills the username after signing out and offers the password through the browser's password manager; on success shows the launch splash
 * briefly, then opens the dashboard.
 */
export function useLoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const remembered = readRemembered()
  const [username, setUsernameState] = useState(remembered)
  const [password, setPasswordState] = useState('')
  const [remember, setRemember] = useState(remembered !== '')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [launching, setLaunching] = useState(false)

  // After signing out with "Remember me" on, bring the saved username and password back from the browser.
  useEffect(() => {
    if (remembered === '') return
    let cancelled = false
    void readFromBrowser().then((saved) => {
      if (cancelled || !saved) return
      setUsernameState(saved.username)
      setPasswordState(saved.password)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setUsername = (value: string) => {
    setUsernameState(stripSpaces(value))
    setFieldErrors((p) => ({ ...p, username: undefined }))
    setError('')
  }
  const setPassword = (value: string) => {
    setPasswordState(stripSpaces(value))
    setFieldErrors((p) => ({ ...p, password: undefined }))
    setError('')
  }
  const blurUsername = () => username && setFieldErrors((p) => ({ ...p, username: validateLoginUsername(username) ?? undefined }))

  const handleSubmit = async () => {
    if (submitting || launching) return
    const errs = { username: validateLoginUsername(username) ?? undefined, password: validateLoginPassword(password) ?? undefined }
    setFieldErrors(errs)
    if (errs.username || errs.password) {
      setError('')
      return
    }
    setSubmitting(true)
    const failure = await login(username.trim(), password, remember)
    setSubmitting(false)
    if (failure === null) {
      try {
        if (remember) localStorage.setItem(REMEMBER_KEY, username.trim())
        else localStorage.removeItem(REMEMBER_KEY)
      } catch {
        /* storage unavailable: sign-in still works */
      }
      if (remember) void saveToBrowser(username.trim(), password)
      setLaunching(true)
      window.setTimeout(() => navigate('/', { replace: true }), 1500)
    } else {
      setError(failure)
    }
  }

  return {
    username,
    setUsername,
    blurUsername,
    password,
    setPassword,
    remember,
    setRemember,
    error,
    fieldErrors,
    submitting,
    launching,
    handleSubmit,
  }
}
