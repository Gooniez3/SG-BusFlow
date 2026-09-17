import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.db import SessionLocal
from app.models.bus_stop import BusStop
from app.repositories.stops import find_nearby_stops, upsert_bus_stops
from services.lta.models import LTABusStop

TEST_STOPS = [
    LTABusStop.model_validate(
        {
            "BusStopCode": "ZZ001",
            "RoadName": "Boon Lay Way",
            "Description": "Boon Lay MRT",
            "Latitude": 1.3386,
            "Longitude": 103.7058,
        }
    ),
    LTABusStop.model_validate(
        {
            "BusStopCode": "ZZ002",
            "RoadName": "Jurong West St 64",
            "Description": "Blk 662C",
            "Latitude": 1.3430,
            "Longitude": 103.7055,
        }
    ),
    LTABusStop.model_validate(
        {
            "BusStopCode": "ZZ009",
            "RoadName": "Somewhere Far",
            "Description": "Too Far",
            "Latitude": 1.3520,
            "Longitude": 103.8200,
        }
    ),
]


@pytest.fixture
def db() -> Session:
    session = SessionLocal()
    try:
        yield session
        session.rollback()
        session.execute(delete(BusStop).where(BusStop.code.in_(["ZZ001", "ZZ002", "ZZ009"])))
        session.commit()
    finally:
        session.close()


def test_nearby_query_orders_by_postgis_distance(db: Session) -> None:
    upsert_bus_stops(db, TEST_STOPS)
    db.commit()

    nearby = find_nearby_stops(db, lat=1.3404, lng=103.7050, radius_m=1000, limit=20)
    codes = [stop.code for stop, _ in nearby]

    assert "ZZ001" in codes
    assert "ZZ002" in codes
    assert "ZZ009" not in codes
    assert codes[0] in {"ZZ001", "ZZ002"}
    distances = [metres for _, metres in nearby]
    assert distances == sorted(distances)
    assert all(metres <= 1000 for metres in distances)


def test_nearby_endpoint_returns_metre_distances(client: TestClient, db: Session) -> None:
    upsert_bus_stops(db, TEST_STOPS)
    db.commit()

    response = client.get(
        "/api/v1/stops/nearby",
        params={"lat": 1.3404, "lng": 103.7050, "radius": 1000},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["radius"] == 1000
    codes = [stop["code"] for stop in payload["stops"] if stop["code"].startswith("ZZ")]
    assert "ZZ001" in codes
    assert "ZZ009" not in codes
    sample = next(stop for stop in payload["stops"] if stop["code"] == "ZZ001")
    assert sample["name"] == "Boon Lay MRT"
    assert isinstance(sample["distance_m"], int)


def test_nearby_rejects_invalid_coordinates(client: TestClient) -> None:
    response = client.get(
        "/api/v1/stops/nearby",
        params={"lat": 99.0, "lng": 103.7050},
    )
    assert response.status_code == 422
