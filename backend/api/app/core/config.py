from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = (
        "postgresql+psycopg://busflow:busflow@localhost:5433/busflow"
    )
    lta_account_key: str = ""
    lta_base_url: str = "https://datamall2.mytransport.sg/ltaodataservice"
    lta_timeout_seconds: float = 10.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
