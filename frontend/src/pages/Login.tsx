import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Brain, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg">
            <Brain size={20} className="text-white" />
          </div>
          <div>
            <div className="text-xl font-bold text-text-primary">DealMind AI</div>
            <div className="text-xs text-text-muted">Sales Agent That Learns</div>
          </div>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h1 className="text-lg font-bold text-text-primary mb-1">Welcome back</h1>
          <p className="text-sm text-text-muted mb-6">Sign in to your account</p>

          {error && (
            <div className="flex items-center gap-2 bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-3 py-2.5 mb-5">
              <AlertCircle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="input pl-9"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input pl-9"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 text-sm mt-2"
            >
              {loading ? <><Loader2 size={14} className="animate-spin" /> Signing in…</> : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-text-muted mt-5">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium">
              Sign up free
            </Link>
          </p>
        </div>

        {/* Demo hint */}
        <div className="mt-4 text-center text-xs text-text-muted">
          Demo account:{' '}
          <button
            onClick={() => { setEmail('alex@dealmind.ai'); setPassword('demo1234') }}
            className="text-brand-400 hover:underline"
          >
            alex@dealmind.ai / demo1234
          </button>
        </div>
      </div>
    </div>
  )
}
