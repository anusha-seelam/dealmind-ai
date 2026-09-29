import { Brain, Clock, Tag, AlertCircle } from 'lucide-react'
import type { MemoryItem } from '../types'
import clsx from 'clsx'

const CONTEXT_COLORS: Record<string, string> = {
  customer_objection:   'bg-red-500/10 text-red-400 border-red-500/20',
  budget_discussion:    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  competitor_mention:   'bg-orange-500/10 text-orange-400 border-orange-500/20',
  next_steps:           'bg-blue-500/10 text-blue-400 border-blue-500/20',
  timeline_discussion:  'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  decision_making:      'bg-purple-500/10 text-purple-400 border-purple-500/20',
  sales_interaction:    'bg-brand-500/10 text-brand-300 border-brand-500/20',
  successful_approach:  'bg-green-500/10 text-green-400 border-green-500/20',
  failed_approach:      'bg-red-900/30 text-red-400 border-red-900/30',
  communication_preference: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  customer_update:      'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  interaction_outcome:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

const CONTEXT_LABELS: Record<string, string> = {
  customer_objection:   'Objection',
  budget_discussion:    'Budget',
  competitor_mention:   'Competitor',
  next_steps:           'Next Steps',
  timeline_discussion:  'Timeline',
  decision_making:      'Decision',
  sales_interaction:    'Interaction',
  successful_approach:  'Success ✓',
  failed_approach:      'Failed ✗',
  communication_preference: 'Preference',
  customer_update:      'Update',
  interaction_outcome:  'Outcome',
}

interface Props {
  memories: MemoryItem[]
  loading?: boolean
  available?: boolean
  title?: string
  emptyMessage?: string
}

export default function MemoryPanel({
  memories,
  loading = false,
  available = true,
  title = 'What DealMind Remembers',
  emptyMessage = 'No memories yet. Start interacting with the AI agent.',
}: Props) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Brain size={15} className="text-memory" />
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {memories.length > 0 && (
          <span className="ml-auto badge bg-memory/10 border border-memory/20 text-memory text-[10px]">
            {memories.length} retrieved
          </span>
        )}
      </div>

      {/* Status bar */}
      {!available && (
        <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 mb-3">
          <AlertCircle size={12} />
          Hindsight unavailable — showing cached context only
        </div>
      )}

      {available && memories.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-memory bg-memory/10 border border-memory/20 rounded-lg px-3 py-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-memory pulse" />
          Memory retrieved from Hindsight
        </div>
      )}

      {/* Memory list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {loading ? (
          <MemorySkeleton />
        ) : memories.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-sm">
            <Brain size={24} className="mx-auto mb-2 opacity-30" />
            {emptyMessage}
          </div>
        ) : (
          memories.map((m, i) => <MemoryCard key={m.id ?? i} memory={m} />)
        )}
      </div>
    </div>
  )
}

function MemoryCard({ memory }: { memory: MemoryItem }) {
  const colorClass = CONTEXT_COLORS[memory.context] ?? CONTEXT_COLORS.sales_interaction
  const label = CONTEXT_LABELS[memory.context] ?? memory.context

  return (
    <div className="memory-glow bg-surface-raised rounded-lg p-3 space-y-2">
      {/* Context badge */}
      <div className="flex items-center gap-1.5">
        <Tag size={10} className="text-text-muted" />
        <span className={clsx('badge border text-[10px]', colorClass)}>{label}</span>
        <span className="ml-auto text-[10px] text-text-muted capitalize">{memory.type}</span>
      </div>

      {/* Memory text */}
      <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">{memory.text}</p>

      {/* Timestamp */}
      {memory.mentioned_at && (
        <div className="flex items-center gap-1 text-[10px] text-text-muted">
          <Clock size={9} />
          {new Date(memory.mentioned_at).toLocaleDateString()}
        </div>
      )}
    </div>
  )
}

function MemorySkeleton() {
  return (
    <>
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-surface-raised rounded-lg p-3 space-y-2 animate-pulse">
          <div className="h-3 w-20 bg-surface-border rounded" />
          <div className="h-3 w-full bg-surface-border rounded" />
          <div className="h-3 w-3/4 bg-surface-border rounded" />
        </div>
      ))}
    </>
  )
}
