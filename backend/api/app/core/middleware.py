from __future__ import annotations

import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import Settings
from app.core.limits import RateLimiter
from app.core.metrics import metrics
from app.core.request_context import client_ip

logger = logging.getLogger("sg-busflow.http")

SKIP_RATE_LIMIT = {"/health", "/health/ready", "/metrics"}

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Cache-Control": "no-store",
}


class HardeningMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, *, settings: Settings, limiter: RateLimiter) -> None:
        super().__init__(app)
        self._settings = settings
        self._limiter = limiter

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:16]
        request.state.request_id = request_id
        started = time.perf_counter()
        path = request.url.path
        limiter: RateLimiter = getattr(request.app.state, "limiter", self._limiter)
        if path not in SKIP_RATE_LIMIT and not path.startswith("/ws/"):
            ip = client_ip(request, self._settings)
            allowed, remaining, limit = limiter.allow(ip, request.method, path)
            if not allowed:
                response = JSONResponse(
                    {"detail": "Too many requests. Try again shortly."},
                    status_code=429,
                    headers={
                        "Retry-After": "60",
                        "X-RateLimit-Limit": str(limit),
                        "X-RateLimit-Remaining": "0",
                    },
                )
                self._secure(response, request_id)
                return response
            request.state.rate_remaining = remaining
            request.state.rate_limit = limit

        metrics.bump("http_requests")
        try:
            response = await call_next(request)
        except Exception:
            metrics.bump("http_errors")
            logger.exception("unhandled error", extra={"request_id": request_id, "path": path})
            response = JSONResponse({"detail": "Internal server error"}, status_code=500)
        else:
            if getattr(response, "status_code", 200) >= 500:
                metrics.bump("http_errors")
        if hasattr(request.state, "rate_limit"):
            response.headers["X-RateLimit-Limit"] = str(request.state.rate_limit)
            response.headers["X-RateLimit-Remaining"] = str(request.state.rate_remaining)
        self._secure(response, request_id)
        logger.info(
            "request",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": path,
                "status": getattr(response, "status_code", 0),
                "ms": round((time.perf_counter() - started) * 1000, 1),
                "client": client_ip(request, self._settings),
            },
        )
        return response

    @staticmethod
    def _secure(response: Response, request_id: str) -> None:
        response.headers["X-Request-ID"] = request_id
        for key, value in SECURITY_HEADERS.items():
            response.headers.setdefault(key, value)
