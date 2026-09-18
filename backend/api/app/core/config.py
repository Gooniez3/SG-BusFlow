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
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"
    )

    def watch_stop_codes(self) -> list[str]:
        return [code.strip() for code in self.lta_watch_stops.split(",") if code.strip()]

    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
