from functools import lru_cache

from redis import Redis
from redis.exceptions import RedisError
from sqlalchemy import text

from app.core.config import get_settings
from app.core.metrics import metrics


@lru_cache
def get_redis() -> Redis:
    settings = get_settings()
    timeout = settings.redis_socket_timeout_seconds
    return Redis.from_url(
        settings.redis_url,
        decode_responses=True,
        socket_timeout=timeout,
        socket_connect_timeout=timeout,
        retry_on_timeout=True,
    )


def redis_ok() -> bool:
    try:
        return bool(get_redis().ping())
    except RedisError:
        metrics.bump("redis_errors")
        return False


def database_ok() -> bool:
    from app.core.db import engine

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
