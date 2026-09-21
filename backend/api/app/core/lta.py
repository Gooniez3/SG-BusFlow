from collections.abc import Generator

from app.core.config import get_settings
from services.lta.client import LTAClient


def create_lta_client() -> LTAClient:
    settings = get_settings()
    return LTAClient(
        account_key=settings.lta_account_key,
        base_url=settings.lta_base_url,
        timeout=settings.lta_timeout_seconds,
        retries=settings.lta_retry_attempts,
        retry_backoff_seconds=settings.lta_retry_backoff_seconds,
    )


def get_lta_client() -> Generator[LTAClient, None, None]:
    client = create_lta_client()
    try:
        yield client
    finally:
        client.close()
