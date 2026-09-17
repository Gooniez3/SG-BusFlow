from app.core import backend_path as _backend_path  # noqa: F401
from app.core.config import get_settings
from services.lta.client import LTAClient


def get_lta_client() -> LTAClient:
    settings = get_settings()
    return LTAClient(
        account_key=settings.lta_account_key,
        base_url=settings.lta_base_url,
        timeout=settings.lta_timeout_seconds,
    )
