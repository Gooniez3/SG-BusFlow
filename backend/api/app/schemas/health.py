from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(examples=["ok"])
    service: str = Field(examples=["sg-busflow-api"])


class ReadyChecks(BaseModel):
    database: bool
    redis: bool
    lta_configured: bool


class ReadyResponse(BaseModel):
    status: str
    service: str = "sg-busflow-api"
    checks: ReadyChecks
    metrics: dict[str, int] = Field(default_factory=dict)
