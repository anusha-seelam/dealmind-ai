import { Link, useLocation } from 'react-router-dom'
import { Brain, LayoutDashboard, BookOpen, Zap, LogOut } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard'       },
  { to: '/deal',     icon: Zap,             label: 'Deal Workspace'  },
  { to: '/learning', icon: BookOpen,        label: 'Learning Center' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const loc = useLocation()
  const { user, logout } = useAuth()

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-surface-card border-r border-surface-border flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-surface-border">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-lg group-hover:bg-brand-500 transition-colors">
              <Brain size={16} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-text-primary leading-none">DealMind</div>
              <div className="text-[10px] text-text-muted mt-0.5">AI Sales Agent</div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, icon: Icon, label }) => {
            const active = to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                className={clsx(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised',
                )}
              >
                <Icon size={15} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User + logout */}
        <div className="px-4 py-3 border-t border-surface-border space-y-2">
          {user && (
            <div className="flex items-center gap-2 px-1">
              <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-text-primary truncate">{user.full_name}</div>
                <div className="text-[10px] text-text-muted truncate">{user.email}</div>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
          >
            <LogOut size={12} />
            Sign out
          </button>
          <div className="flex items-center gap-2 text-[10px] text-text-muted pt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-memory pulse" />
            Powered by Hindsight
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
