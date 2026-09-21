from __future__ import annotations

from starlette.requests import Request

from app.core.config import Settings


def client_ip(request: Request, settings: Settings) -> str:
    if settings.trust_x_forwarded_for:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"
