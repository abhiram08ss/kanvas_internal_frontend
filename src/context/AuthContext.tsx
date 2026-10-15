import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, errorMessage, tokenStore, UNAUTHORIZED_EVENT, type PlatformUser } from '../api'

interface AuthContextValue {
  isAuthenticated: boolean
  /** True while a stored session token is being validated on page load. */
  loading: boolean
  user: PlatformUser | null
  username: string
  /** Resolves to null on success, or a message to show the user. */
  login: (username: string, password: string, remember?: boolean) => Promise<string | null>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PlatformUser | null>(null)
  const [loading, setLoading] = useState(() => tokenStore.get() !== null)

  // Restore the session after a refresh: ask the server who the stored token belongs to.
  useEffect(() => {
    if (tokenStore.get() === null) return
    api
      .me()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false))
  }, [])

  // The API client fires this when the token expires or is revoked (e.g. "Flush Session Cache").
  useEffect(() => {
    const onUnauthorized = () => setUser(null)
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [])

  const login = useCallback(async (username: string, password: string, remember = false) => {
    try {
      const res = await api.login(username.trim(), password, remember)
      tokenStore.set(res.accessToken, remember)
      setUser(res.user)
      return null
    } catch (e) {
      return errorMessage(e)
    }
  }, [])

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated: user !== null, loading, user, username: user?.username ?? '', login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
