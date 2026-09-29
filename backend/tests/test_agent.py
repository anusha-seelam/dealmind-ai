"""
Tests for the DealMind AI agent and Hindsight memory flow.

Run: pytest tests/ -v  (from the backend/ directory)
"""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.database.db import init_db, AsyncSessionLocal
from app.models.deal import Deal


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
async def setup_db(tmp_path):
    """Each test gets its own fresh SQLite file for complete isolation."""
    import os
    db_file = tmp_path / "test.db"
    os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{db_file}"

    from app.config import get_settings
    get_settings.cache_clear()

    # Rebuild the engine and session pointing at the fresh temp DB
    from app.database import db as db_module
    from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
    from sqlalchemy.orm import sessionmaker

    new_engine = create_async_engine(f"sqlite+aiosqlite:///{db_file}", echo=False)
    db_module.engine = new_engine
    db_module.AsyncSessionLocal = sessionmaker(  # type: ignore[call-overload]
        new_engine, class_=AsyncSession, expire_on_commit=False
    )

    await init_db()
    yield

    await new_engine.dispose()


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture
def mock_hindsight():
    """Mock the Hindsight client so tests don't need a real Hindsight server."""
    with patch("app.services.hindsight_service._get_client") as mock_factory:
        mock_client = MagicMock()
        # retain returns successfully
        mock_client.retain.return_value = MagicMock()
        # recall returns a realistic response
        recall_result = MagicMock()
        recall_result.results = [
            MagicMock(
                id="mem-001",
                text="Customer mentioned implementation time is a major concern.",
                type="world",
                context="customer_objection",
                scores=None,
                mentioned_at=None,
            )
        ]
        mock_client.recall.return_value = recall_result
        # reflect returns a response
        reflect_result = MagicMock()
        reflect_result.text = "Based on past interactions, focus on phased rollout."
        reflect_result.based_on = MagicMock()
        reflect_result.based_on.memories = []
        mock_client.reflect.return_value = reflect_result
        # list_memories for bank stats
        mock_client.list_memories.return_value = MagicMock(total=5, items=[])
        # create_bank
        mock_client.create_bank.return_value = MagicMock()
        mock_factory.return_value = mock_client
        yield mock_client


@pytest.fixture
def mock_llm():
    """Mock the OpenAI client so tests don't make real API calls."""
    with patch("app.services.llm_service._get_client") as mock_factory:
        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(
            return_value=MagicMock(
                choices=[MagicMock(message=MagicMock(content="**Recommendation:** Focus on phased rollout to address implementation concerns."))]
            )
        )
        mock_factory.return_value = mock_client
        yield mock_client


# ── Tests: API health ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health_endpoint(client, mock_hindsight):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "hindsight" in data


# ── Tests: Deal creation ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_deal(client, mock_hindsight):
    """Creating a deal should persist it and create a Hindsight bank."""
    payload = {
        "salesperson_name": "Alex Morgan",
        "customer_name": "Sarah Chen",
        "customer_company": "NovaTech",
        "customer_industry": "Technology",
        "customer_role": "CTO",
        "title": "Enterprise Analytics Platform",
        "value": 80000,
        "stage": "Negotiation",
        "expected_close_days": 30,
    }
    resp = await client.post("/api/deals", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["customer_company"] == "NovaTech"
    assert data["value"] == 80000.0
    assert "bank_id" in data
    # Verify Hindsight bank was created
    mock_hindsight.create_bank.assert_called_once()


@pytest.mark.asyncio
async def test_list_deals_empty(client, mock_hindsight):
    resp = await client.get("/api/deals")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_get_deal_not_found(client, mock_hindsight):
    resp = await client.get("/api/deals/nonexistent-id")
    assert resp.status_code == 404


# ── Tests: Hindsight memory store ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_store_memory_in_hindsight(mock_hindsight):
    """Verify retain_interaction calls Hindsight with correct params."""
    from app.services.hindsight_service import retain_interaction
    result = await retain_interaction(
        bank_id="test-bank",
        content="Customer concerned about implementation timeline.",
        context="customer_objection",
        document_id="doc-001",
    )
    assert result["success"] is True
    mock_hindsight.retain.assert_called_once()
    call_kwargs = mock_hindsight.retain.call_args.kwargs
    assert call_kwargs["bank_id"] == "test-bank"
    assert "implementation" in call_kwargs["content"]
    assert call_kwargs["context"] == "customer_objection"
    assert call_kwargs["document_id"] == "doc-001"


# ── Tests: Hindsight memory retrieval ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_recall_deal_context(mock_hindsight):
    """Verify recall_deal_context returns memories from Hindsight."""
    from app.services.hindsight_service import recall_deal_context
    result = await recall_deal_context(
        bank_id="test-bank",
        query="What are the customer's concerns?",
        budget="mid",
    )
    assert result["available"] is True
    assert result["count"] == 1
    assert "implementation" in result["memories"][0]["text"]
    mock_hindsight.recall.assert_called_once()


@pytest.mark.asyncio
async def test_recall_returns_empty_on_hindsight_failure():
    """When Hindsight is down, recall should degrade gracefully."""
    with patch("app.services.hindsight_service._get_client") as mock_factory:
        mock_factory.side_effect = Exception("Connection refused")
        from app.services.hindsight_service import recall_deal_context
        result = await recall_deal_context(
            bank_id="test-bank",
            query="any query",
        )
    assert result["available"] is False
    assert result["count"] == 0
    assert result["memories"] == []
    assert result["error"] is not None


# ── Tests: AI uses retrieved memory ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_llm_receives_memories(mock_hindsight, mock_llm):
    """The LLM should receive the recalled memories as context."""
    from app.services.llm_service import generate_recommendation
    deal_ctx = {
        "salesperson_name": "Alex Morgan",
        "customer_name": "Sarah Chen",
        "customer_company": "NovaTech",
        "customer_industry": "Technology",
        "customer_role": "CTO",
        "title": "Enterprise Analytics",
        "value": 80000,
        "stage": "Negotiation",
        "expected_close_days": 30,
    }
    memories = [
        {"text": "Customer concerned about implementation timeline.", "type": "world", "context": "customer_objection"}
    ]
    result = await generate_recommendation(
        current_message="How should I prepare for the next meeting?",
        deal_context=deal_ctx,
        recalled_memories=memories,
    )
    assert result["error"] is None
    assert "Recommendation" in result["recommendation"]
    # Verify LLM was called
    mock_llm.chat.completions.create.assert_called_once()
    # Verify memories were in the prompt
    call_args = mock_llm.chat.completions.create.call_args
    messages = call_args.kwargs["messages"]
    user_msg = next(m for m in messages if m["role"] == "user")
    assert "implementation" in user_msg["content"].lower()


# ── Tests: Full agent flow ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_agent_full_loop(mock_hindsight, mock_llm):
    """End-to-end: process_interaction should recall, generate, and store."""
    from app.agents.sales_agent import process_interaction
    deal = {
        "id": "deal-001",
        "bank_id": "deal-test-001",
        "salesperson_name": "Alex Morgan",
        "customer_name": "Sarah Chen",
        "customer_company": "NovaTech",
        "customer_industry": "Technology",
        "customer_role": "CTO",
        "customer_email": None,
        "title": "Enterprise Analytics",
        "value": 80000,
        "stage": "Negotiation",
        "expected_close_days": 30,
        "product_service": None,
    }
    result = await process_interaction(
        deal=deal,
        message="How should I handle her implementation concerns?",
    )
    # Recall was performed
    mock_hindsight.recall.assert_called_once()
    # LLM was called
    mock_llm.chat.completions.create.assert_called_once()
    # Memory was stored after
    mock_hindsight.retain.assert_called_once()
    # Result has correct shape
    assert "recommendation" in result
    assert "recalled_memories" in result
    assert result["memory_stored"] is True


@pytest.mark.asyncio
async def test_chat_endpoint_full(client, mock_hindsight, mock_llm):
    """POST /api/deals/{id}/chat should return a complete recommendation."""
    # First create a deal
    create_resp = await client.post("/api/deals", json={
        "salesperson_name": "Alex Morgan",
        "customer_name": "Sarah Chen",
        "customer_company": "NovaTech",
        "customer_industry": "Technology",
        "customer_role": "CTO",
        "title": "Enterprise Analytics",
        "value": 80000,
        "stage": "Negotiation",
        "expected_close_days": 30,
    })
    assert create_resp.status_code == 201
    deal_id = create_resp.json()["id"]

    # Send a chat message
    chat_resp = await client.post(f"/api/deals/{deal_id}/chat", json={
        "message": "What should I do next?"
    })
    assert chat_resp.status_code == 200
    data = chat_resp.json()
    assert "recommendation" in data
    assert "recalled_memories" in data
    assert "memory_count" in data
    assert "hindsight_available" in data
    assert "memory_stored" in data


# ── Tests: Hindsight failure handling ────────────────────────────────────────

@pytest.mark.asyncio
async def test_chat_works_when_hindsight_is_down(client, mock_llm):
    """If Hindsight is unavailable, chat should still work with fallback."""
    with patch("app.services.hindsight_service._get_client") as mock_factory:
        mock_client = MagicMock()
        mock_client.create_bank.return_value = MagicMock()
        mock_client.recall.side_effect = Exception("Hindsight connection refused")
        mock_client.retain.side_effect = Exception("Hindsight connection refused")
        mock_client.list_memories.side_effect = Exception("Hindsight connection refused")
        mock_factory.return_value = mock_client

        create_resp = await client.post("/api/deals", json={
            "salesperson_name": "Alex",
            "customer_name": "Bob",
            "customer_company": "Acme",
            "customer_industry": "Tech",
            "customer_role": "CEO",
            "title": "Test Deal",
            "value": 10000,
            "stage": "Discovery",
            "expected_close_days": 60,
        })
        deal_id = create_resp.json()["id"]

        chat_resp = await client.post(f"/api/deals/{deal_id}/chat", json={
            "message": "What should I do?"
        })
        assert chat_resp.status_code == 200
        data = chat_resp.json()
        # Even without Hindsight, we get a recommendation (from LLM with no context)
        assert "recommendation" in data
        assert data["hindsight_available"] is False
        assert data["memory_count"] == 0


# ── Tests: Demo interactions show improvement ─────────────────────────────────

@pytest.mark.asyncio
async def test_interaction_1_generic_less_memories(mock_hindsight, mock_llm):
    """
    Interaction 1 should recall 0 memories (no prior context).
    Interaction 5 should recall more memories (seeded context).
    This is the core Hindsight before/after demonstration.
    """
    from app.agents.sales_agent import run_demo_interaction
    deal = {
        "id": "deal-demo",
        "bank_id": "deal-test-demo",
        "salesperson_name": "Alex",
        "customer_name": "Sarah Chen",
        "customer_company": "NovaTech",
        "customer_industry": "Technology",
        "customer_role": "CTO",
        "customer_email": None,
        "title": "Enterprise Analytics",
        "value": 80000,
        "stage": "Negotiation",
        "expected_close_days": 30,
        "product_service": None,
    }

    # Interaction 1: no seed memories → recall returns 1 (the mock always returns 1)
    result_1 = await run_demo_interaction(deal=deal, interaction_number=1)
    assert "recommendation" in result_1

    # Reset call count
    mock_hindsight.retain.reset_mock()
    mock_hindsight.recall.reset_mock()

    # Interaction 5: seed memories are stored first, then recalled
    result_5 = await run_demo_interaction(deal=deal, interaction_number=5)
    assert "recommendation" in result_5
    # 5 seed memories stored + 1 interaction memory
    assert mock_hindsight.retain.call_count >= 5


@pytest.mark.asyncio
async def test_store_outcome_updates_memory(mock_hindsight):
    """store_outcome should call Hindsight retain with outcome context."""
    from app.services.hindsight_service import store_outcome
    result = await store_outcome(
        bank_id="test-bank",
        interaction_summary="Proposed phased rollout to customer.",
        outcome="Customer responded positively. Said it makes implementation manageable.",
        document_id="outcome-001",
    )
    assert result["success"] is True
    call_kwargs = mock_hindsight.retain.call_args.kwargs
    assert "outcome" in call_kwargs["content"].lower()
    assert call_kwargs["context"] == "interaction_outcome"
