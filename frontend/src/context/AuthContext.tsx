import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface AuthUser {
  user_id: string
  email: string
  full_name: string
  access_token: string
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, full_name: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const TOKEN_KEY = 'dealmind_token'
const USER_KEY  = 'dealmind_user'

async function apiAuth(path: string, body: object): Promise<AuthUser> {
  const res = await fetch(`/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(typeof err.detail === 'string' ? err.detail : 'Authentication failed.')
  }
  return res.json()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(USER_KEY)
      if (stored) setUser(JSON.parse(stored))
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  const persist = (u: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, u.access_token)
    localStorage.setItem(USER_KEY, JSON.stringify(u))
    setUser(u)
  }

  const login = async (email: string, password: string) => {
    const data = await apiAuth('login', { email, password })
    persist(data)
  }

  const register = async (email: string, password: string, full_name: string) => {
    const data = await apiAuth('register', { email, password, full_name })
    persist(data)
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** Returns the stored JWT token for API calls */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
