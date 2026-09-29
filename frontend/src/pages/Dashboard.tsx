import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Brain, TrendingUp, MessageSquare, Database, ArrowRight,
  Zap, AlertCircle, CheckCircle2, RefreshCw,
} from 'lucide-react'
import { getStats } from '../services/api'
import type { DashboardStats } from '../types'

const STAGES = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won']

function StageBar({ stage }: { stage: string }) {
  const idx = STAGES.indexOf(stage)
  const pct = idx >= 0 ? Math.round(((idx + 1) / STAGES.length) * 100) : 50
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-text-muted">
        <span>{stage}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-surface-border rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon, label, value, sub, color = 'brand',
}: {
  icon: typeof Brain
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  const colors: Record<string, string> = {
    brand:   'bg-brand-600/10 text-brand-400',
    memory:  'bg-memory/10 text-memory',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
  }
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon size={17} />
      </div>
      <div>
        <div className="text-xl font-bold text-text-primary leading-none">{value}</div>
        <div className="text-xs text-text-muted mt-0.5">{label}</div>
        {sub && <div className="text-[10px] text-text-muted mt-1">{sub}</div>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const s = await getStats()
      setStats(s)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const deal = stats?.featured_deal

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Sales Intelligence</h1>
          <p className="text-sm text-text-muted mt-1">
            An AI sales agent that learns from every deal through Hindsight memory
          </p>
        </div>
        <button onClick={load} className="btn-ghost text-xs" disabled={loading}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Hindsight status */}
      {stats && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border mb-6 ${
          stats.hindsight_available
            ? 'bg-success/10 border-success/20 text-success'
            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
        }`}>
          {stats.hindsight_available
            ? <><CheckCircle2 size={13} /> Hindsight memory active — agent is learning</>
            : <><AlertCircle size={13} /> Hindsight offline — configure HINDSIGHT_BASE_URL in .env</>
          }
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-danger/20 bg-danger/10 text-danger mb-6">
          <AlertCircle size={13} /> Backend unreachable: {error}
        </div>
      )}

      {/* Stats row */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => <div key={i} className="card p-4 h-20 animate-pulse bg-surface-raised" />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={TrendingUp}    label="Active Deals"       value={stats.total_deals}        color="brand"   />
          <StatCard icon={MessageSquare} label="AI Interactions"    value={stats.total_interactions} color="success" />
          <StatCard icon={Database}      label="Hindsight Memories" value={stats.total_memories}     color="memory"  />
          <StatCard icon={Brain}         label="Learning Status"    value={stats.hindsight_available ? 'Active' : 'Offline'}
                    sub={stats.hindsight_available ? 'Agent learning in real-time' : 'Start Hindsight server'}
                    color={stats.hindsight_available ? 'memory' : 'warning'} />
        </div>
      ) : null}

      {/* Featured deal */}
      {deal && (
        <div className="card mb-8 overflow-hidden">
          <div className="px-5 py-4 bg-surface-raised border-b border-surface-border flex items-center gap-3">
            <Zap size={15} className="text-brand-400" />
            <span className="text-sm font-semibold text-text-primary">Featured Deal</span>
            <span className="ml-auto badge bg-brand-600/20 border border-brand-500/30 text-brand-300">
              {deal.stage}
            </span>
          </div>

          <div className="p-5 grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="text-xs text-text-muted mb-1">Deal</div>
                <div className="text-lg font-bold text-text-primary">{deal.title}</div>
                <div className="text-2xl font-bold text-brand-400 mt-1">
                  ${deal.value.toLocaleString()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-text-muted">Customer</div>
                  <div className="text-text-primary font-medium mt-0.5">{deal.customer_name}</div>
                </div>
                <div>
                  <div className="text-text-muted">Company</div>
                  <div className="text-text-primary font-medium mt-0.5">{deal.customer_company}</div>
                </div>
                <div>
                  <div className="text-text-muted">Role</div>
                  <div className="text-text-primary font-medium mt-0.5">{deal.customer_role}</div>
                </div>
                <div>
                  <div className="text-text-muted">Close</div>
                  <div className="text-text-primary font-medium mt-0.5">{deal.expected_close_days} days</div>
                </div>
              </div>

              <StageBar stage={deal.stage} />
            </div>

            <div className="space-y-3">
              {/* Memory stats */}
              <div className="card-raised p-3 flex items-center gap-2.5">
                <Brain size={14} className="text-memory flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-text-primary">
                    {deal.memory_count} memories stored
                  </div>
                  <div className="text-[10px] text-text-muted">Hindsight bank: {deal.bank_id}</div>
                </div>
              </div>

              <div className="card-raised p-3 flex items-center gap-2.5">
                <MessageSquare size={14} className="text-brand-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-text-primary">
                    {deal.interaction_count} AI interactions
                  </div>
                  <div className="text-[10px] text-text-muted">Each one remembered by agent</div>
                </div>
              </div>

              {/* AI Insight teaser */}
              <div className="card-raised p-3 border-l-2 border-brand-500">
                <div className="text-[10px] text-brand-400 mb-1 font-medium">AI INSIGHT</div>
                <div className="text-xs text-text-secondary">
                  Open the Deal Workspace to get personalized recommendations based on {deal.memory_count > 0 ? `${deal.memory_count} stored memories` : 'this deal context'}.
                </div>
              </div>

              <Link to="/deal" className="btn-primary w-full justify-center text-sm">
                Open Deal Workspace
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-4">
          The Hindsight Learning Loop
        </h2>
        <div className="grid grid-cols-5 gap-2 text-center text-xs">
          {[
            { icon: '💬', label: 'Interact', sub: 'Sales conversation' },
            { icon: '🧠', label: 'Remember', sub: 'Stored in Hindsight' },
            { icon: '🔍', label: 'Recall',   sub: 'Retrieved for context' },
            { icon: '⚡', label: 'Recommend',sub: 'AI uses memories' },
            { icon: '📈', label: 'Learn',    sub: 'Gets smarter over time' },
          ].map(({ icon, label, sub }, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="w-9 h-9 rounded-full bg-surface-raised border border-surface-border flex items-center justify-center text-base">
                {icon}
              </div>
              <div className="font-semibold text-text-primary text-[11px]">{label}</div>
              <div className="text-text-muted text-[10px]">{sub}</div>
              {i < 4 && (
                <div className="hidden col-span-1 items-center text-text-muted" />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-3 px-4">
          {[0,1,2,3].map(i => (
            <div key={i} className="flex-1 h-px bg-surface-border mx-1 relative">
              <ArrowRight size={10} className="absolute -right-1.5 top-1/2 -translate-y-1/2 text-text-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
