import { Brain, Lightbulb, ChevronDown, ChevronUp, Database, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import type { MemoryItem } from '../types'

interface Props {
  recommendation: string
  memories: MemoryItem[]
  memoryCount: number
  hindsightAvailable: boolean
  memoryStored: boolean
  timestamp?: string
}

export default function RecommendationCard({
  recommendation,
  memories,
  memoryCount,
  hindsightAvailable,
  memoryStored,
  timestamp,
}: Props) {
  const [showMemories, setShowMemories] = useState(false)

  return (
    <div className="card border-brand-500/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-brand-600/10 border-b border-brand-500/20">
        <div className="w-6 h-6 bg-brand-600 rounded flex items-center justify-center flex-shrink-0">
          <Brain size={13} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-brand-300">DealMind AI Recommendation</div>
          {timestamp && (
            <div className="text-[10px] text-text-muted">{new Date(timestamp).toLocaleTimeString()}</div>
          )}
        </div>

        {/* Memory badge */}
        <div className="flex items-center gap-1.5 text-[10px] bg-memory/10 border border-memory/20 text-memory rounded-full px-2 py-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-memory" />
          {memoryCount} memor{memoryCount !== 1 ? 'ies' : 'y'} used
        </div>
      </div>

      {/* Memory source pill */}
      {memoryCount > 0 && (
        <div className="px-4 pt-3 flex items-center gap-2 text-[10px]">
          {hindsightAvailable ? (
            <span className="flex items-center gap-1 bg-memory/10 border border-memory/20 text-memory rounded-full px-2 py-0.5">
              <Database size={9} /> Recalled from Hindsight memory
            </span>
          ) : (
            <span className="flex items-center gap-1 bg-surface-raised border border-surface-border text-text-muted rounded-full px-2 py-0.5">
              <Database size={9} /> Demo memories (start Hindsight for live memory)
            </span>
          )}
          {memoryStored && (
            <span className="flex items-center gap-1 bg-success/10 border border-success/20 text-success rounded-full px-2 py-0.5">
              ✓ Stored in memory
            </span>
          )}
        </div>
      )}

      {/* Recommendation text */}
      <div className="px-4 py-4">
        <RecommendationBody text={recommendation} />
      </div>

      {/* Memories used — collapsible */}
      {memories.length > 0 && (
        <div className="border-t border-surface-border">
          <button
            onClick={() => setShowMemories(!showMemories)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-text-muted hover:text-text-secondary hover:bg-surface-raised transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Lightbulb size={12} className="text-memory" />
              <span>Memories that shaped this recommendation ({memories.length})</span>
            </div>
            {showMemories ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {showMemories && (
            <div className="px-4 pb-3 space-y-2">
              {memories.slice(0, 6).map((m, i) => (
                <div key={m.id ?? i} className="flex items-start gap-2 text-xs bg-surface-raised rounded-lg p-2.5 border border-surface-border">
                  <span className="text-memory mt-0.5 flex-shrink-0">•</span>
                  <div className="min-w-0">
                    <div className="text-[10px] text-memory mb-0.5 capitalize">{m.context.replace(/_/g, ' ')}</div>
                    <div className="text-text-secondary leading-relaxed">{m.text}</div>
                  </div>
                </div>
              ))}

              {!hindsightAvailable && (
                <div className="flex items-center gap-1.5 text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 mt-2">
                  <AlertCircle size={10} />
                  Using demo memories — start Hindsight for persistent real-time memory
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** Renders markdown-like text into clean HTML for display */
function RecommendationBody({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: JSX.Element[] = []
  let key = 0
  let listItems: string[] = []

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="space-y-1.5 ml-4 my-2">
          {listItems.map((item, i) => (
            <li key={i} className="text-sm text-text-secondary list-disc leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
          ))}
        </ul>
      )
      listItems = []
    }
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flushList()
      continue
    }
    if (line.startsWith('## ')) {
      flushList()
      elements.push(
        <h2 key={key++} className="text-sm font-bold text-text-primary mt-4 mb-2 border-b border-surface-border pb-1">
          {line.replace('## ', '')}
        </h2>
      )
    } else if (line.startsWith('### ')) {
      flushList()
      elements.push(
        <h3 key={key++} className="text-xs font-semibold text-brand-300 mt-3 mb-1 uppercase tracking-wider">
          {line.replace('### ', '')}
        </h3>
      )
    } else if (line.startsWith('---')) {
      flushList()
      elements.push(<hr key={key++} className="border-surface-border my-3" />)
    } else if (line.match(/^[-*] /) || line.match(/^\d+\. /)) {
      const content = line.replace(/^[-*] /, '').replace(/^\d+\. /, '')
      listItems.push(content)
    } else if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**')) {
      flushList()
      elements.push(
        <p key={key++} className="text-[11px] text-text-muted italic my-1"
          dangerouslySetInnerHTML={{ __html: renderInline(line.slice(1, -1)) }} />
      )
    } else {
      flushList()
      elements.push(
        <p key={key++} className="text-sm text-text-secondary leading-relaxed my-1"
          dangerouslySetInnerHTML={{ __html: renderInline(line) }} />
      )
    }
  }
  flushList()

  return <div className="space-y-0.5">{elements}</div>
}

function renderInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-text-primary font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-text-muted">$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-surface-raised px-1 rounded text-brand-300 text-[11px]">$1</code>')
}
