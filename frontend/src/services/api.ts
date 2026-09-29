import { getToken } from '../context/AuthContext'
import type {
  ChatResponse, DashboardStats, Deal,
  DemoResponse, Interaction, MemoriesResponse,
} from '../types'

const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  if (res.status === 401) {
    // Token expired — clear storage and redirect to login
    localStorage.removeItem('dealmind_token')
    localStorage.removeItem('dealmind_user')
    window.location.href = '/login'
    throw new Error('Session expired. Please log in again.')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(typeof err.detail === 'string' ? err.detail : `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ── Deals ─────────────────────────────────────────────────────────────────────
export const getDeals = (): Promise<Deal[]> => request('/deals')
export const getDeal  = (id: string): Promise<Deal> => request(`/deals/${id}`)
export const getInteractions = (dealId: string): Promise<Interaction[]> =>
  request(`/deals/${dealId}/interactions`)

// ── Chat / Agent ──────────────────────────────────────────────────────────────
export const sendMessage = (
  dealId: string,
  message: string,
  conversation_history?: Array<{ role: string; content: string }>,
): Promise<ChatResponse> =>
  request(`/deals/${dealId}/chat`, {
    method: 'POST',
    body: JSON.stringify({ message, conversation_history }),
  })

// ── Memories ──────────────────────────────────────────────────────────────────
export const getMemories = (dealId: string, query?: string): Promise<MemoriesResponse> => {
  const qs = query ? `?query=${encodeURIComponent(query)}` : ''
  return request(`/deals/${dealId}/memories${qs}`)
}
export const storeMemory = (
  dealId: string, content: string, context = 'customer_update',
): Promise<{ success: boolean; doc_id: string }> =>
  request(`/deals/${dealId}/memory`, {
    method: 'POST',
    body: JSON.stringify({ content, context }),
  })

// ── Demo ──────────────────────────────────────────────────────────────────────
export const runDemo = (dealId: string, interaction_number: number): Promise<DemoResponse> =>
  request(`/deals/${dealId}/demo`, {
    method: 'POST',
    body: JSON.stringify({ interaction_number }),
  })

// ── Stats ─────────────────────────────────────────────────────────────────────
export const getStats = (): Promise<DashboardStats> => request('/stats')

// ── Health ────────────────────────────────────────────────────────────────────
export const getHealth = (): Promise<{ status: string; hindsight: string }> =>
  request('/health')
