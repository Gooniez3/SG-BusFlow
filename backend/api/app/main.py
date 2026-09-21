from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import router as api_v1_router
from app.core import backend_path as _backend_path  # noqa: F401
from app.core.config import get_settings
from app.core.limits import RateLimiter
from app.core.logging import configure_logging
from app.core.metrics import metrics
from app.core.middleware import HardeningMiddleware
from app.core.redis import database_ok, get_redis, redis_ok
from app.schemas.health import HealthResponse, ReadyChecks, ReadyResponse
from app.ws.hub import ConnectionHub
from app.ws.routes import router as ws_router

settings = get_settings()
configure_logging(json_logs=settings.log_json)


@asynccontextmanager
async def lifespan(app: FastAPI):
    redis = None
    try:
        redis = get_redis()
        redis.ping()
    except Exception:
        redis = None
    limiter = RateLimiter.from_settings(settings, redis)
    hub = ConnectionHub(
        settings.redis_url,
        max_connections=settings.ws_max_connections,
        max_per_ip=settings.ws_max_connections_per_ip,
    )
    await hub.start()
    app.state.hub = hub
    app.state.limiter = limiter
    try:
        yield
    finally:
        await hub.stop()


app = FastAPI(
    title="SG BusFlow API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.expose_docs else None,
    redoc_url="/redoc" if settings.expose_docs else None,
    openapi_url="/openapi.json" if settings.expose_docs else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)
app.add_middleware(
    HardeningMiddleware,
    settings=settings,
    limiter=RateLimiter.from_settings(settings, None),
)

app.include_router(api_v1_router, prefix="/api/v1")
app.include_router(ws_router)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", service="sg-busflow-api")


@app.get("/health/ready", response_model=ReadyResponse)
async def ready() -> ReadyResponse:
    checks = ReadyChecks(
        database=database_ok(),
        redis=redis_ok(),
        lta_configured=bool(settings.lta_account_key.strip()),
    )
    ok = checks.database and checks.redis
    return ReadyResponse(
        status="ok" if ok else "degraded",
        checks=checks,
        metrics=metrics.snapshot(),
    )


@app.get("/metrics")
async def get_metrics() -> JSONResponse:
    return JSONResponse(metrics.snapshot())
