"""Application configuration loaded from environment variables."""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Hindsight
    hindsight_base_url: str = "http://localhost:8888"
    hindsight_api_key: str = ""

    # LLM (used by the DealMind agent itself)
    llm_provider: str = "groq"
    llm_api_key: str = ""
    llm_model: str = "openai/gpt-oss-20b"

    # Backend
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    database_url: str = "sqlite:///./dealmind.db"
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"
    log_level: str = "INFO"

    # Demo/offline mode — uses mock memories when Hindsight is unreachable
    demo_mode: bool = True

    # JWT auth
    jwt_secret: str = "dealmind-super-secret-key-change-in-production-2024"

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
