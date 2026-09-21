from __future__ import annotations

from datetime import datetime, timezone

from services.cache.models import CachedStopArrivals


def aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def arrival_age_seconds(cached_at: datetime, *, now: datetime | None = None) -> int:
    current = aware(now or datetime.now(timezone.utc))
    age = (current - aware(cached_at)).total_seconds()
    return max(0, int(age))


def apply_freshness(
    cached: CachedStopArrivals,
    *,
    now: datetime | None = None,
    stale_after_seconds: int = 90,
    force_stale: bool = False,
) -> CachedStopArrivals:
    current = now or datetime.now(timezone.utc)
    age = arrival_age_seconds(cached.cached_at, now=current)
    if force_stale or cached.stale or age > stale_after_seconds:
        cached.stale = True
    return cached
