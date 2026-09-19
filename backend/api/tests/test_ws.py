from fastapi.testclient import TestClient

from app.main import app


def test_invalid_bus_id_is_rejected() -> None:
    with TestClient(app) as client:
        with client.websocket_connect("/ws/v1/buses/not-a-bus") as websocket:
            payload = websocket.receive_json()
            assert payload["type"] == "error"
            assert "Invalid" in payload["detail"]


def test_unknown_stop_socket_is_rejected() -> None:
    with TestClient(app) as client:
        with client.websocket_connect("/ws/v1/stops/NOPE99") as websocket:
            payload = websocket.receive_json()
            assert payload["type"] == "error"
            assert "not found" in payload["detail"].lower()
