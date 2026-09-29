import { useState } from 'react'
import {
  Brain, Play, Zap, ArrowRight, CheckCircle2, Clock,
  Lightbulb, RefreshCw, ChevronDown, ChevronUp, AlertCircle,
} from 'lucide-react'
import { getDeals, runDemo } from '../services/api'
import type { DemoResponse, MemoryItem } from '../types'
import MemoryPanel from '../components/MemoryPanel'

const DEMO_DEAL_BANK = 'deal-novatech-001'

const STAGES = [
  {
    number: 1,
    label: 'Interaction 1 — First Contact',
    description: 'Agent has NO prior knowledge of this customer.',
    expected: 'Generic sales advice. No personalization.',
    color: 'border-surface-border',
    icon: '🌱',
  },
  {
    number: 5,
    label: 'Interaction 5 — Building Context',
    description: 'Agent recalls 5 stored memories: objection, budget, competitor, success, decision maker.',
    expected: 'Personalized advice using recalled context.',
    color: 'border-brand-500/40',
    icon: '📈',
  },
  {
    number: 20,
    label: 'Interaction 20 — Deep Context',
    description: 'Agent uses 8+ memories including successful approaches, failed tactics, preferences.',
    expected: 'Highly specific advice shaped by accumulated history.',
    color: 'border-memory/40',
    icon: '🧠',
  },
]

interface StageResult {
  response: DemoResponse
  runAt: Date
}

export default function LearningCenter() {
  const [results, setResults] = useState<Record<number, StageResult>>({})
  const [running, setRunning] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [dealId, setDealId] = useState<string | null>(null)

  const loadDealId = async (): Promise<string> => {
    if (dealId) return dealId
    const deals = await getDeals()
    const novatech = deals.find(d => d.bank_id === DEMO_DEAL_BANK)
    const id = novatech?.id ?? deals[0]?.id
    if (!id) throw new Error('No demo deal found — run seed_data.py first')
    setDealId(id)
    return id
  }

  const runStage = async (n: number) => {
    setRunning(n)
    setError(null)
    try {
      const id = await loadDealId()
      const result = await runDemo(id, n)
      setResults(prev => ({ ...prev, [n]: { response: result, runAt: new Date() } }))
      setExpanded(n)
    } catch (e) {
      setError(String(e))
    } finally {
      setRunning(null)
    }
  }

  const allRun = STAGES.every(s => results[s.number])

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Brain size={20} className="text-memory" />
          <h1 className="text-2xl font-bold text-text-primary">Learning Center</h1>
        </div>
        <p className="text-sm text-text-muted max-w-xl">
          Demonstrate how DealMind AI improves over time through Hindsight memory.
          Run each stage to see the difference between an agent without memory and one with deep context.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-danger/20 bg-danger/10 text-danger mb-6">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {/* Before/After comparison teaser */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="card p-4 border-surface-border/60">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">❌</span>
            <span className="text-sm font-semibold text-text-primary">Without Hindsight Memory</span>
          </div>
          <div className="bg-surface-raised rounded-lg p-3 text-xs text-text-secondary italic border-l-2 border-surface-border">
            "My payment failed again."<br /><br />
            <span className="text-text-muted not-italic">Generic agent:</span><br />
            "Please check your payment method and try again. If the issue persists, contact support."
          </div>
        </div>

        <div className="card p-4 border-memory/20 bg-memory/5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">✅</span>
            <span className="text-sm font-semibold text-text-primary">With Hindsight Memory</span>
          </div>
          <div className="bg-surface-raised rounded-lg p-3 text-xs text-text-secondary italic border-l-2 border-memory/60">
            "My payment failed again."<br /><br />
            <span className="text-memory not-italic">DealMind (from memory):</span><br />
            "I can see that Sarah previously flagged implementation cost as a concern and you resolved that with a phased rollout. Given NovaTech's fixed $85K budget and their positive response to structured approaches, I'd recommend…"
          </div>
        </div>
      </div>

      {/* Demo stages */}
      <div className="space-y-4 mb-8">
        {STAGES.map(stage => {
          const result = results[stage.number]
          const isRunning = running === stage.number
          const isExpanded = expanded === stage.number

          return (
            <div key={stage.number} className={`card border-2 ${stage.color} overflow-hidden`}>
              {/* Stage header */}
              <div className="px-5 py-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-surface-raised border border-surface-border flex items-center justify-center text-xl flex-shrink-0">
                  {stage.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-text-primary">{stage.label}</h3>
                    {result && (
                      <span className="badge bg-success/10 border-success/20 text-success text-[10px]">
                        <CheckCircle2 size={9} /> Completed
                      </span>
                    )}
                    {result && (
                      <span className="badge bg-memory/10 border-memory/20 text-memory text-[10px]">
                        <Brain size={9} /> {result.response.memory_count} memories recalled
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted mt-1">{stage.description}</p>
                  <p className="text-xs text-brand-400 mt-0.5">
                    <strong>Expected:</strong> {stage.expected}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {result && (
                    <button
                      onClick={() => setExpanded(isExpanded ? null : stage.number)}
                      className="btn-ghost text-xs"
                    >
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      {isExpanded ? 'Hide' : 'View'}
                    </button>
                  )}
                  <button
                    onClick={() => runStage(stage.number)}
                    disabled={isRunning || running !== null}
                    className="btn-primary text-xs"
                  >
                    {isRunning ? (
                      <><RefreshCw size={13} className="animate-spin" /> Running…</>
                    ) : (
                      <><Play size={13} /> Run {result ? 'Again' : 'Demo'}</>
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded result */}
              {result && isExpanded && (
                <div className="border-t border-surface-border bg-surface-raised/30">
                  <div className="grid md:grid-cols-2 gap-0 divide-x divide-surface-border">
                    {/* Left: AI recommendation */}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap size={13} className="text-brand-400" />
                        <span className="text-xs font-semibold text-text-primary">AI Recommendation</span>
                        <span className="ml-auto text-[10px] text-text-muted flex items-center gap-1">
                          <Clock size={9} />
                          {result.runAt.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-xs text-text-secondary leading-relaxed bg-surface-card rounded-lg p-3 border border-surface-border max-h-48 overflow-y-auto">
                        <pre className="whitespace-pre-wrap font-sans">{result.response.recommendation}</pre>
                      </div>

                      {/* Demo message used */}
                      <div className="mt-3 text-[10px] text-text-muted">
                        <span className="text-brand-400">Salesperson asked:</span>{' '}
                        {result.response.demo_message}
                      </div>

                      {!result.response.hindsight_available && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] text-yellow-400">
                          <AlertCircle size={10} />
                          Hindsight was unavailable during this run
                        </div>
                      )}
                    </div>

                    {/* Right: Memories used */}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain size={13} className="text-memory" />
                        <span className="text-xs font-semibold text-text-primary">
                          Memories Recalled ({result.response.memory_count})
                        </span>
                      </div>
                      {result.response.recalled_memories.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {result.response.recalled_memories.map((m, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-text-muted bg-surface-card rounded p-2 border border-surface-border">
                              <span className="text-memory mt-0.5 flex-shrink-0">•</span>
                              <span className="line-clamp-2">{m.text}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-text-muted italic">
                          No memories recalled — {stage.number === 1
                            ? 'this is expected for Interaction 1 (no prior context).'
                            : 'ensure Hindsight is running.'}
                        </div>
                      )}

                      {result.response.memory_stored && (
                        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-success">
                          <CheckCircle2 size={10} />
                          This interaction was stored in Hindsight memory
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Progress timeline */}
      {allRun && (
        <div className="card p-5 border-memory/20 bg-memory/5">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={16} className="text-memory" />
            <h2 className="text-sm font-semibold text-text-primary">Learning Progression Visible</h2>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex-1 text-center">
              <div className="text-2xl mb-1">🌱</div>
              <div className="font-semibold text-text-primary">Interaction 1</div>
              <div className="text-text-muted">Generic</div>
              <div className="text-[10px] text-text-muted">{results[1]?.response.memory_count ?? 0} memories</div>
            </div>
            <ArrowRight size={16} className="text-text-muted flex-shrink-0" />
            <div className="flex-1 text-center">
              <div className="text-2xl mb-1">📈</div>
              <div className="font-semibold text-text-primary">Interaction 5</div>
              <div className="text-text-muted">Personalized</div>
              <div className="text-[10px] text-memory">{results[5]?.response.memory_count ?? 0} memories recalled</div>
            </div>
            <ArrowRight size={16} className="text-text-muted flex-shrink-0" />
            <div className="flex-1 text-center">
              <div className="text-2xl mb-1">🧠</div>
              <div className="font-semibold text-text-primary">Interaction 20</div>
              <div className="text-text-muted">Deep Context</div>
              <div className="text-[10px] text-memory">{results[20]?.response.memory_count ?? 0} memories recalled</div>
            </div>
          </div>
          <div className="mt-4 text-xs text-text-muted text-center italic">
            "DealMind doesn't just remember sales data. It learns from sales experience."
          </div>
        </div>
      )}
    </div>
  )
}
