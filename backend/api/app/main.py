from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core import backend_path as _backend_path  # noqa: F401
from app.api.v1.router import router as api_v1_router
from app.core.config import get_settings
from app.schemas.health import HealthResponse
from app.ws.hub import ConnectionHub
from app.ws.routes import router as ws_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    hub = ConnectionHub(settings.redis_url)
    await hub.start()
    app.state.hub = hub
    try:
        yield
    finally:
        await hub.stop()


app = FastAPI(
    title="SG BusFlow API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router, prefix="/api/v1")
app.include_router(ws_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router, prefix="/api/v1")


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", service="sg-busflow-api")
