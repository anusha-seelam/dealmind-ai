"""DealMind AI — FastAPI application entry point."""

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database.db import init_db
from app.api.routes import router
from app.api.auth_routes import router as auth_router

settings = get_settings()

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initialising database …")
    await init_db()
    logger.info("Database ready.")
    logger.info("DealMind AI started on http://%s:%s", settings.backend_host, settings.backend_port)
    logger.info("Hindsight endpoint: %s", settings.hindsight_base_url)
    logger.info("LLM provider: %s  model: %s", settings.llm_provider, settings.llm_model)
    yield
    # shutdown (nothing to clean up currently)


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="DealMind AI",
    description=(
        "AI Sales Agent with Hindsight memory. "
        "Remember → Recall → Recommend → Learn."
    ),
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(router)
