import pytest
from fastapi.testclient import TestClient

from app.core.limits import RateLimiter
from app.main import app


@pytest.fixture(autouse=True)
def _open_rate_limits() -> None:
    RateLimiter.testing_bypass = True
    yield
    RateLimiter.testing_bypass = True


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
