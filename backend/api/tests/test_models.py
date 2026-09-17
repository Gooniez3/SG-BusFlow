from geoalchemy2 import Geography

from app.models import (
    Arrival,
    Base,
    Bus,
    BusRoute,
    BusRouteStop,
    BusService,
    BusStop,
    FavoriteService,
    FavoriteStop,
    User,
)


def test_expected_tables_are_registered() -> None:
    assert set(Base.metadata.tables) == {
        "arrivals",
        "bus_route_stops",
        "bus_routes",
        "bus_services",
        "bus_stops",
        "buses",
        "favorite_services",
        "favorite_stops",
        "users",
    }


def test_bus_stop_location_is_postgis_geography() -> None:
    location = BusStop.__table__.c.location.type

    assert isinstance(location, Geography)
    assert location.geometry_type == "POINT"
    assert location.srid == 4326


def test_bus_stop_spatial_index_uses_gist() -> None:
    indexes = {index.name: index for index in BusStop.__table__.indexes}
    spatial = indexes["ix_bus_stops_location"]

    assert spatial.dialect_options["postgresql"]["using"] == "gist"


def test_service_route_stop_relationship_chain() -> None:
    assert "routes" in BusService.__mapper__.relationships
    assert "route_stops" in BusRoute.__mapper__.relationships
    assert "stop" in BusRouteStop.__mapper__.relationships
    assert BusRouteStop.route.property.mapper.class_ is BusRoute
    assert BusRouteStop.stop.property.mapper.class_ is BusStop


def test_user_and_favorite_models_exist() -> None:
    assert User.__tablename__ == "users"
    assert FavoriteStop.__tablename__ == "favorite_stops"
    assert FavoriteService.__tablename__ == "favorite_services"
    assert Arrival.__tablename__ == "arrivals"
    assert Bus.__tablename__ == "buses"
