# DealMind AI

> **"An AI sales agent that learns from every deal."**

Built for the **AI Agents That Learn Using Hindsight** hackathon.  
Hindsight is the heart of this application — not an add-on.

---

## Problem

B2B salespeople lose critical context between customer interactions. Between calls, emails, and meetings:

- Objections raised in Week 1 are forgotten by Week 3
- Successful tactics go unrecorded
- Failed approaches get repeated
- Each new conversation starts from scratch

The result: generic, impersonal selling that ignores the customer's actual history.

---

## Solution

DealMind gives every salesperson an AI agent that **remembers everything** about a deal — and uses that memory to give progressively better recommendations over time.

```
Interaction 1  →  Generic advice (no prior context)
Interaction 5  →  Personalized (remembers objections, budget, competitors)
Interaction 20 →  Deeply contextual (recalls successful approaches, failed tactics, preferences)
```

---

## Why Hindsight?

Normal conversation history is **session-scoped** — it resets every time.  
A normal database stores **raw data**, not intelligent, searchable memories.

Hindsight provides:

| Feature | Why it matters for DealMind |
|---|---|
| **Semantic recall** | "What are this customer's biggest concerns?" finds relevant memories even if the exact words differ |
| **Persistent memory banks** | One bank per deal — all memories survive across sessions, weeks, months |
| **Observation consolidation** | Hindsight automatically synthesizes patterns: "Customer consistently rejects upfront cost proposals" |
| **Context-aware storage** | Memories tagged by type (objection / competitor / success / budget) for filtered recall |

---

## Architecture

```
Salesperson
    ↓
React Frontend (Vite + Tailwind)
    ↓
FastAPI Backend  (/api/*)
    ↓
AI Sales Agent (sales_agent.py)
    ├── hindsight_service.py  ← recall relevant memories
    ├── llm_service.py        ← generate recommendation
    └── hindsight_service.py  ← store new interaction
    ↓
Hindsight Memory Server (http://localhost:8888)
    ↓  (one bank per deal)
LLM (Groq / OpenAI / any OpenAI-compatible provider)
```

---

## The Memory Lifecycle

```
1. Salesperson asks a question about their deal
2. Agent RECALLS relevant memories from Hindsight (semantic search)
3. Agent sends: question + deal context + recalled memories → LLM
4. LLM generates a personalized recommendation
5. Agent STORES this interaction in Hindsight (for future recall)
6. Repeat — agent gets smarter every interaction
```

**Remember → Recall → Recommend → Learn → Remember Again**

---

## Key Files

```
dealmind/
├── backend/
│   ├── app/
│   │   ├── services/
│   │   │   ├── hindsight_service.py   ← ALL Hindsight operations
│   │   │   └── llm_service.py         ← LLM recommendation generation
│   │   ├── agents/
│   │   │   └── sales_agent.py         ← Orchestrates the learning loop
│   │   ├── api/routes.py              ← FastAPI endpoints
│   │   └── models/deal.py             ← SQLAlchemy ORM
│   ├── seed_data.py                   ← Demo data (NovaTech deal)
│   └── tests/test_agent.py            ← Tests for memory flow
└── frontend/
    └── src/
        ├── pages/
        │   ├── Dashboard.tsx          ← Screen 1: Stats & featured deal
        │   ├── DealWorkspace.tsx      ← Screen 2+3: Deal + AI chat
        │   └── LearningCenter.tsx     ← Screen 4: Demo mode
        └── components/
            ├── MemoryPanel.tsx        ← Shows retrieved Hindsight memories
            └── RecommendationCard.tsx ← AI response with memory citations
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Backend | Python 3.11+, FastAPI, SQLAlchemy (async) |
| Database | SQLite (app data) |
| Memory | **Hindsight** — persistent memory layer |
| LLM | Groq (configurable: OpenAI, Anthropic, any OpenAI-compatible) |

---

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- A running Hindsight server (see below)
- An LLM API key (Groq recommended — fast & free tier available)

### 1. Start Hindsight

**Option A — Docker (recommended):**
```bash
docker run -d --name hindsight --restart unless-stopped \
  -p 8888:8888 \
  -e HINDSIGHT_API_LLM_PROVIDER=groq \
  -e HINDSIGHT_API_LLM_API_KEY=your_groq_key \
  -e HINDSIGHT_API_LLM_MODEL=openai/gpt-oss-20b \
  -v hindsight-data:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

**Option B — pip (embedded, no Docker):**
```bash
pip install hindsight-api
export HINDSIGHT_API_LLM_PROVIDER=groq
export HINDSIGHT_API_LLM_API_KEY=your_groq_key
hindsight-api
```

Hindsight will be available at `http://localhost:8888`.

### 2. Backend

```bash
cd dealmind/backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp ../.env.example .env
# Edit .env — set LLM_API_KEY and HINDSIGHT_BASE_URL

# Seed demo data (NovaTech deal)
python seed_data.py

# Start backend
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd dealmind/frontend

npm install
npm run dev
```

Open http://localhost:5173

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `HINDSIGHT_BASE_URL` | URL of your Hindsight server | Yes |
| `LLM_PROVIDER` | `groq` \| `openai` \| `together` | Yes |
| `LLM_API_KEY` | API key for the LLM provider | Yes |
| `LLM_MODEL` | Model name (default: `openai/gpt-oss-20b`) | No |
| `DATABASE_URL` | SQLite path (default: `sqlite:///./dealmind.db`) | No |
| `HINDSIGHT_API_KEY` | Only if Hindsight auth is enabled | No |

---

## Running Tests

```bash
cd dealmind/backend
pytest tests/ -v
```

Tests cover:
- Memory store in Hindsight
- Memory retrieval from Hindsight
- AI uses recalled memories in recommendation
- Full end-to-end agent loop
- Graceful degradation when Hindsight is offline
- Demo interaction progression (Interaction 1 → 5 → 20)

---

## Demo

### 60-second demo flow:

1. **Open Dashboard** — see NovaTech deal, memory count, Hindsight status
2. **Open Deal Workspace** — see the 3-panel layout (deals / chat / memories)
3. **Ask: "What should I do next?"** — watch Hindsight recall 0 memories (first time)
4. **Open Learning Center** — click **Run Demo** for Interaction 1
   - 0 memories recalled → generic advice
5. **Click Run Demo** for Interaction 5
   - 5 seed memories stored → personalized advice with specific context
6. **Click Run Demo** for Interaction 20
   - 8+ deep memories → highly specific advice about failed tactics, preferences, CTO briefing style
7. **Return to Deal Workspace** — notice the Memory Panel now shows recalled memories
8. **Judge sees:** the same question, completely different quality of answer

### The judge's takeaway:
> "Without memory this agent is generic. With Hindsight, it knows the customer."

---

## Hindsight Integration Details

**Where Hindsight is used** (`backend/app/services/hindsight_service.py`):

| Function | Hindsight operation | When called |
|---|---|---|
| `create_deal_bank()` | `client.create_bank()` | Deal created |
| `retain_interaction()` | `client.retain()` | After every AI recommendation |
| `recall_deal_context()` | `client.recall()` | Before every AI recommendation |
| `store_outcome()` | `client.retain()` | After salesperson logs outcome |
| `get_bank_stats()` | `client.list_memories()` | Dashboard stats |

**Memory bank design:**
- One bank per deal: `bank_id = "deal-novatech-001"`
- Context labels: `customer_objection`, `budget_discussion`, `competitor_mention`, `successful_approach`, `failed_approach`, `next_steps`
- Document IDs group related interaction messages

**The learning loop in code** (`backend/app/agents/sales_agent.py`):
```python
# 1. Recall
recall_result = await hindsight_service.recall_deal_context(bank_id, query)
# 2. Recommend  
llm_result = await llm_service.generate_recommendation(message, deal, recalled_memories)
# 3. Store
await hindsight_service.retain_interaction(bank_id, interaction_content)
```

---

## Future Scope

- Email/CRM integration — auto-ingest emails into Hindsight
- Multi-salesperson teams — shared deal memory banks
- Win/loss analysis — Hindsight learns what closes deals across all customers
- Competitor intelligence — shared bank across the sales team for competitor data
- Voice transcription — auto-store meeting recordings

---

*DealMind AI — "An AI sales agent that learns from every deal."*
