import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Brain, Mail, Lock, User, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await register(email, password, fullName)
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const strong = password.length >= 8
  const match  = confirm.length > 0 && password === confirm

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
          <h1 className="text-lg font-bold text-text-primary mb-1">Create your account</h1>
          <p className="text-sm text-text-muted mb-6">Start closing smarter deals today</p>

          {error && (
            <div className="flex items-center gap-2 bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-3 py-2.5 mb-5">
              <AlertCircle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full name */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Full name
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Alex Morgan"
                  required
                  className="input pl-9"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Work email
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
                {password.length > 0 && (
                  <span className={`ml-2 ${strong ? 'text-success' : 'text-warning'}`}>
                    {strong ? '— strong' : '— min 6 chars'}
                  </span>
                )}
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

            {/* Confirm */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input pl-9 pr-9"
                />
                {match && (
                  <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-success" />
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 text-sm mt-2"
            >
              {loading
                ? <><Loader2 size={14} className="animate-spin" /> Creating account…</>
                : 'Create account'
              }
            </button>
          </form>

          <p className="text-center text-sm text-text-muted mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>

        {/* Feature bullets */}
        <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs text-text-muted">
          {[
            { icon: '🧠', label: 'Hindsight Memory' },
            { icon: '⚡', label: 'AI Recommendations' },
            { icon: '📈', label: 'Learns Over Time' },
          ].map(f => (
            <div key={f.label} className="card-raised px-2 py-3 rounded-lg">
              <div className="text-base mb-1">{f.icon}</div>
              <div>{f.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
