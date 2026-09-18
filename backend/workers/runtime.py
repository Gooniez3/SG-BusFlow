from __future__ import annotations

import logging
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
API_ROOT = BACKEND_ROOT / "api"
for path in (str(BACKEND_ROOT), str(API_ROOT)):
    if path not in sys.path:
        sys.path.insert(0, path)

from app.core.config import Settings, get_settings  # noqa: E402
from app.core.lta import create_lta_client  # noqa: E402
from app.core.redis import get_redis  # noqa: E402
from services.cache.store import CacheStore  # noqa: E402
from services.lta.client import LTAClient  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("workers")


def runtime() -> tuple[LTAClient, CacheStore, Settings]:
    settings = get_settings()
    return create_lta_client(), CacheStore(get_redis()), settings
