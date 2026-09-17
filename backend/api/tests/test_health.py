from fastapi.testclient import TestClient


def test_health_returns_ok(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "sg-busflow-api",
    }


def test_api_v1_prefix_is_mounted(client: TestClient) -> None:
    response = client.get("/api/v1/not-implemented")

    assert response.status_code == 404
