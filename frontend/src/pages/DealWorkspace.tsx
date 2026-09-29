import { useEffect, useState, useRef } from 'react'
import {
  Brain, Send, Plus, RefreshCw, ChevronRight,
  Building2, User, DollarSign, Calendar, AlertCircle,
} from 'lucide-react'
import { getDeals, getDeal, getMemories, sendMessage, storeMemory } from '../services/api'
import type { Deal, MemoryItem, Interaction } from '../types'
import MemoryPanel from '../components/MemoryPanel'
import RecommendationCard from '../components/RecommendationCard'
import clsx from 'clsx'

interface ChatMessage {
  role: 'user' | 'agent'
  content: string
  memories?: MemoryItem[]
  memoryCount?: number
  hindsightAvailable?: boolean
  memoryStored?: boolean
  timestamp: Date
}

export default function DealWorkspace() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [selected, setSelected] = useState<Deal | null>(null)
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingMemories, setLoadingMemories] = useState(false)
  const [noteInput, setNoteInput] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [noteSuccess, setNoteSuccess] = useState(false)
  const [activeMemories, setActiveMemories] = useState<MemoryItem[]>([])
  const chatEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getDeals().then(d => {
      setDeals(d)
      const novatech = d.find(x => x.bank_id === 'deal-novatech-001') || d[0]
      if (novatech) selectDeal(novatech)
    }).catch(console.error)
  }, [])

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat])

  const selectDeal = async (deal: Deal) => {
    setSelected(deal)
    setChat([])
    setActiveMemories([])
    setLoadingMemories(true)
    try {
      const [full, mems] = await Promise.all([
        getDeal(deal.id),
        getMemories(deal.id),
      ])
      setSelected(full)
      setMemories(mems.memories)
      setActiveMemories(mems.memories.slice(0, 6))
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingMemories(false)
    }
  }

  const handleSend = async () => {
    if (!selected || !input.trim() || sending) return
    const msg = input.trim()
    setInput('')
    setSending(true)
    setChat(prev => [...prev, { role: 'user', content: msg, timestamp: new Date() }])

    try {
      const history = chat.slice(-6).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }))
      const res = await sendMessage(selected.id, msg, history)
      setChat(prev => [...prev, {
        role: 'agent',
        content: res.recommendation,
        memories: res.recalled_memories,
        memoryCount: res.memory_count,
        hindsightAvailable: res.hindsight_available,
        memoryStored: res.memory_stored,
        timestamp: new Date(),
      }])
      // Update memory panel with latest recalled memories
      if (res.recalled_memories.length > 0) {
        setActiveMemories(res.recalled_memories)
      }
      // Refresh deal stats
      getDeal(selected.id).then(setSelected).catch(() => {})
    } catch (e) {
      setChat(prev => [...prev, {
        role: 'agent',
        content: `⚠️ Error: ${String(e)}`,
        timestamp: new Date(),
      }])
    } finally {
      setSending(false)
    }
  }

  const handleSaveNote = async () => {
    if (!selected || !noteInput.trim()) return
    setSavingNote(true)
    try {
      await storeMemory(selected.id, noteInput.trim())
      setNoteInput('')
      setNoteSuccess(true)
      setTimeout(() => setNoteSuccess(false), 2000)
      // Refresh memories
      const mems = await getMemories(selected.id)
      setMemories(mems.memories)
      setActiveMemories(mems.memories.slice(0, 6))
    } catch (e) {
      console.error(e)
    } finally {
      setSavingNote(false)
    }
  }

  const QUICK = [
    'What are the biggest risks in this deal right now?',
    "How should I handle Sarah's implementation concerns?",
    'Prepare me for the next meeting with NovaTech.',
    "What objections has Sarah raised and how did we address them?",
    'What is our competitive advantage over the other vendors?',
  ]

  return (
    <div className="h-screen flex overflow-hidden">
      {/* LEFT: Deal list */}
      <div className="w-52 flex-shrink-0 border-r border-surface-border bg-surface-card flex flex-col">
        <div className="px-4 py-3 border-b border-surface-border">
          <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Active Deals
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {deals.map(d => (
            <button
              key={d.id}
              onClick={() => selectDeal(d)}
              className={clsx(
                'w-full text-left px-3 py-2.5 border-b border-surface-border/50 transition-colors',
                selected?.id === d.id ? 'bg-brand-600/10' : 'hover:bg-surface-raised'
              )}
            >
              <div className="text-xs font-medium text-text-primary truncate">
                {d.customer_company}
              </div>
              <div className="text-[10px] text-text-muted mt-0.5 truncate">{d.title}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] text-brand-400 font-medium">
                  ${(d.value / 1000).toFixed(0)}k
                </span>
                <span className="text-[10px] text-text-muted">•</span>
                <span className="text-[10px] text-text-muted">{d.stage}</span>
              </div>
              {d.memory_count > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Brain size={9} className="text-memory" />
                  <span className="text-[10px] text-memory">{d.memory_count} memories</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* CENTRE: Deal info + chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <>
            {/* Deal header */}
            <div className="flex-shrink-0 border-b border-surface-border px-5 py-3 bg-surface-card">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-sm font-bold text-text-primary truncate">{selected.customer_company}</h1>
                    <span className="badge bg-brand-600/20 border border-brand-500/30 text-brand-300 text-[10px]">
                      {selected.stage}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">{selected.title}</div>
                </div>
                <div className="flex items-center gap-4 text-xs text-text-muted flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <User size={11} />
                    {selected.customer_name}
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign size={11} className="text-brand-400" />
                    <span className="text-brand-400 font-medium">${selected.value.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={11} />
                    {selected.expected_close_days}d
                  </div>
                  <div className="flex items-center gap-1 text-memory">
                    <Brain size={11} />
                    {selected.memory_count} mem
                  </div>
                </div>
              </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {chat.length === 0 && (
                <div className="text-center py-12">
                  <Brain size={32} className="mx-auto text-memory mb-3 opacity-60" />
                  <p className="text-sm font-medium text-text-secondary">Ask DealMind AI anything about this deal</p>
                  <p className="text-xs text-text-muted mt-1 mb-6">The agent will recall relevant memories from Hindsight</p>
                  <div className="grid grid-cols-1 gap-2 max-w-lg mx-auto">
                    {QUICK.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { setInput(q); }}
                        className="text-left text-xs text-text-muted hover:text-text-secondary bg-surface-raised hover:bg-surface-border px-3 py-2 rounded-lg border border-surface-border transition-colors flex items-center gap-2"
                      >
                        <ChevronRight size={11} className="text-brand-500 flex-shrink-0" />
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chat.map((msg, i) => (
                <div key={i} className={clsx('max-w-2xl', msg.role === 'user' ? 'ml-auto' : '')}>
                  {msg.role === 'user' ? (
                    <div className="bg-brand-600/20 border border-brand-500/30 rounded-xl px-4 py-2.5 text-sm text-text-primary">
                      {msg.content}
                    </div>
                  ) : (
                    <RecommendationCard
                      recommendation={msg.content}
                      memories={msg.memories ?? []}
                      memoryCount={msg.memoryCount ?? 0}
                      hindsightAvailable={msg.hindsightAvailable ?? true}
                      memoryStored={msg.memoryStored ?? false}
                      timestamp={msg.timestamp.toISOString()}
                    />
                  )}
                </div>
              ))}

              {sending && (
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                  Recalling memories from Hindsight…
                </div>
              )}
              <div ref={chatEnd} />
            </div>

            {/* Quick note logger */}
            <div className="flex-shrink-0 border-t border-surface-border px-4 py-2 bg-surface-card/50">
              <div className="flex items-center gap-2">
                <Plus size={13} className="text-memory flex-shrink-0" />
                <input
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveNote()}
                  placeholder="Log a customer note directly to memory… (press Enter)"
                  className="flex-1 bg-transparent text-xs text-text-secondary placeholder:text-text-muted outline-none"
                />
                {noteSuccess && <span className="text-[10px] text-success">✓ Saved to Hindsight</span>}
                {savingNote && <RefreshCw size={11} className="text-memory animate-spin" />}
              </div>
            </div>

            {/* Message input */}
            <div className="flex-shrink-0 border-t border-surface-border px-4 py-3 bg-surface-card">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Ask DealMind AI for recommendations…"
                  className="input text-sm"
                />
                <button onClick={handleSend} disabled={sending || !input.trim()} className="btn-primary px-4">
                  {sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-muted">
            <div className="text-center">
              <Building2 size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a deal to begin</p>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Memory panel */}
      <div className="w-72 flex-shrink-0 border-l border-surface-border bg-surface-card p-4 overflow-y-auto">
        {loadingMemories ? (
          <div className="flex items-center gap-2 text-xs text-text-muted py-4">
            <RefreshCw size={12} className="animate-spin" />
            Loading memories from Hindsight…
          </div>
        ) : selected ? (
          <MemoryPanel
            memories={activeMemories}
            available={true}
            title="What DealMind Remembers"
            emptyMessage="No memories yet. Start chatting to build context."
          />
        ) : (
          <div className="text-center py-8 text-text-muted text-xs">
            <Brain size={20} className="mx-auto mb-2 opacity-30" />
            Select a deal to see memories
          </div>
        )}

        {/* Memory legend */}
        {activeMemories.length > 0 && (
          <div className="mt-4 pt-4 border-t border-surface-border space-y-2">
            <div className="text-[10px] text-text-muted font-medium uppercase tracking-wider">
              Memory → Response Flow
            </div>
            <div className="text-[10px] text-text-muted space-y-1">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-px bg-memory" />
                Recalled from Hindsight
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-px bg-brand-500" />
                Used in recommendation
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-px bg-success" />
                New memory stored
              </div>
            </div>
          </div>
        )}

        {selected && memories.length === 0 && !loadingMemories && (
          <div className="mt-4 pt-4 border-t border-surface-border">
            <div className="flex items-start gap-2 text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
              <AlertCircle size={10} className="flex-shrink-0 mt-0.5" />
              <span>No memories yet — ensure Hindsight is running and start chatting to build context.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
