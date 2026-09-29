export interface Deal {
  id: string
  bank_id: string
  salesperson_name: string
  customer_name: string
  customer_company: string
  customer_industry: string
  customer_role: string
  customer_email: string | null
  title: string
  value: number
  stage: string
  expected_close_days: number
  product_service: string | null
  created_at: string
  interaction_count: number
  memory_count: number
}

export interface MemoryItem {
  id?: string
  text: string
  type: string
  context: string
  score?: Record<string, number>
  mentioned_at?: string
}

export interface Interaction {
  id: string
  deal_id: string
  role: 'customer' | 'salesperson' | 'agent'
  content: string
  recommendation: string | null
  recalled_memories: MemoryItem[] | null
  memory_count: number
  hindsight_doc_id: string | null
  created_at: string
}

export interface ChatResponse {
  recommendation: string
  recalled_memories: MemoryItem[]
  memory_count: number
  hindsight_available: boolean
  hindsight_doc_id: string
  memory_stored: boolean
  error?: string
}

export interface DemoResponse {
  demo_label: string
  demo_message: string
  recommendation: string
  recalled_memories: MemoryItem[]
  memory_count: number
  hindsight_available: boolean
  memory_stored: boolean
  error?: string
}

export interface DashboardStats {
  total_deals: number
  total_interactions: number
  total_memories: number
  hindsight_available: boolean
  featured_deal: Deal | null
}

export interface MemoriesResponse {
  memories: MemoryItem[]
  count: number
  error: string | null
  available: boolean
}
