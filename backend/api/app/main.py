from fastapi import FastAPI

from app.api.v1.router import router as api_v1_router
from app.schemas.health import HealthResponse

app = FastAPI(
    title="SG BusFlow API",
    version="0.1.0",
)

app.include_router(api_v1_router, prefix="/api/v1")


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", service="sg-busflow-api")
