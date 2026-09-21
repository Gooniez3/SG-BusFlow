from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_API_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(_API_ROOT / ".env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = (
        "postgresql+psycopg://busflow:busflow@localhost:5433/busflow"
    )
    lta_account_key: str = ""
    lta_base_url: str = "https://datamall2.mytransport.sg/ltaodataservice"
    lta_timeout_seconds: float = 10.0
    redis_url: str = "redis://localhost:6379/0"
    arrival_cache_ttl_seconds: int = 30
    static_cache_ttl_seconds: int = 86400
    lta_watch_stops: str = ""
    arrival_poll_interval_seconds: int = 20
    cors_origins: str = (
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:8081,http://127.0.0.1:8081"
    )
    groq_api_key: str = ""
    gemini_api_key: str = ""
    openai_api_key: str = ""
    openai_base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai"
    openai_model: str = "gemini-3.6-flash"
    rate_limit_per_minute: int = 120
    rate_limit_assistant_per_minute: int = 20
    rate_limit_journey_per_minute: int = 40
    ws_max_connections: int = 200
    ws_max_connections_per_ip: int = 8
    ws_idle_seconds: int = 90
    lta_retry_attempts: int = 2
    lta_retry_backoff_seconds: float = 0.25
    stale_after_seconds: int = 90
    redis_socket_timeout_seconds: float = 2.0
    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_pool_recycle_seconds: int = 1800
    trust_x_forwarded_for: bool = False
    log_json: bool = False
    expose_docs: bool = True

    def llm_provider(self) -> str:
        if self.groq_api_key.strip():
            return "groq"
        if self.gemini_api_key.strip():
            return "gemini"
        if self.openai_api_key.strip():
            return "openai"
        return ""

    def llm_api_key(self) -> str:
        provider = self.llm_provider()
        if provider == "groq":
            return self.groq_api_key.strip()
        if provider == "gemini":
            return self.gemini_api_key.strip()
        return self.openai_api_key.strip()

    def llm_base_url(self) -> str:
        if self.llm_provider() == "groq":
            return "https://api.groq.com/openai/v1"
        url = (self.openai_base_url or "").strip()
        if self.llm_provider() == "openai" and "generativelanguage.googleapis.com" in url:
            return "https://api.openai.com/v1"
        return url or "https://generativelanguage.googleapis.com/v1beta/openai"

    def llm_model(self) -> str:
        model = (self.openai_model or "").strip()
        if self.llm_provider() == "groq":
            if model and not model.startswith("gemini") and model != "gpt-4o-mini":
                return model
            return "openai/gpt-oss-120b"
        model = model or "gemini-3.6-flash"
        return {
            "gemini-2.5-flash": "gemini-3.6-flash",
            "gemini-2.0-flash": "gemini-3.6-flash",
            "gemini-1.5-flash": "gemini-3.6-flash",
            "gpt-4o-mini": "gemini-3.6-flash",
        }.get(model, model)

    def watch_stop_codes(self) -> list[str]:
        return [code.strip() for code in self.lta_watch_stops.split(",") if code.strip()]

    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
