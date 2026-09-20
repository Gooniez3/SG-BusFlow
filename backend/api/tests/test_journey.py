from app.journey.planner import StopInfo, build_graph, plan_journeys


def _stop(code: str, lat: float, lng: float, name: str | None = None) -> StopInfo:
    return StopInfo(code=code, name=name or code, road_name=None, lat=lat, lng=lng)


def _graph():
    a = _stop("A", 1.3400, 103.7000, "Origin Stop")
    b = _stop("B", 1.3410, 103.7100, "Mid")
    c = _stop("C", 1.3500, 103.9900, "Airport")
    d = _stop("D", 1.3450, 103.8500, "Transfer")
    e = _stop("E", 1.3470, 103.9200, "Second transfer")
    rows = [
        ("36", 1, 1, 0.0, a),
        ("36", 1, 2, 4.0, b),
        ("36", 1, 3, 12.0, c),
        ("12", 1, 1, 0.0, a),
        ("12", 1, 2, 8.0, d),
        ("24", 1, 1, 0.0, d),
        ("24", 1, 2, 16.0, c),
        ("8", 1, 1, 0.0, a),
        ("8", 1, 2, 6.0, d),
        ("9", 1, 1, 0.0, d),
        ("9", 1, 2, 5.0, e),
        ("10", 1, 1, 0.0, e),
        ("10", 1, 2, 8.0, c),
    ]
    return build_graph(rows), a, c, d


def test_direct_bus_ranks_ahead_of_transfer() -> None:
    graph, origin, dest, _transfer = _graph()
    options = plan_journeys(
        graph=graph,
        origin=(origin.lat, origin.lng),
        dest=(dest.lat, dest.lng),
        origin_stops=[(origin, 80)],
        dest_stops=[(dest, 40)],
        origin_label="Current location",
        dest_label="Changi Airport",
    )
    assert options
    first = options[0]
    assert first["transfers"] == 0
    bus_legs = [leg for leg in first["legs"] if leg["kind"] == "bus"]
    assert bus_legs[0]["service_no"] == "36"
    assert any(leg["kind"] == "walk" for leg in first["legs"])
    assert "live_minutes" in bus_legs[0]
    assert bus_legs[0]["live_minutes"] is None


def test_live_wait_uses_cached_minutes_not_invented_clock() -> None:
    graph, origin, dest, _transfer = _graph()
    options = plan_journeys(
        graph=graph,
        origin=(origin.lat, origin.lng),
        dest=(dest.lat, dest.lng),
        origin_stops=[(origin, 0)],
        dest_stops=[(dest, 0)],
        live={
            "A": {
                "stale": False,
                "services": [{"service_no": "36", "arrivals": [{"minutes": 3}]}],
            }
        },
    )
    bus = next(leg for leg in options[0]["legs"] if leg["kind"] == "bus")
    assert bus["live_minutes"] == 3
    assert bus["wait_min"] == 3
    assert options[0]["live"] is True
    assert "estimated_arrival" not in bus


def test_one_transfer_is_found_when_no_direct() -> None:
    a = _stop("A", 1.34, 103.70)
    d = _stop("D", 1.345, 103.85)
    c = _stop("C", 1.35, 103.99)
    graph = build_graph(
        [
            ("12", 1, 1, 0.0, a),
            ("12", 1, 2, 8.0, d),
            ("24", 1, 1, 0.0, d),
            ("24", 1, 2, 16.0, c),
        ]
    )
    options = plan_journeys(
        graph=graph,
        origin=(a.lat, a.lng),
        dest=(c.lat, c.lng),
        origin_stops=[(a, 0)],
        dest_stops=[(c, 0)],
    )
    assert options[0]["transfers"] == 1
    services = [leg["service_no"] for leg in options[0]["legs"] if leg["kind"] == "bus"]
    assert services == ["12", "24"]


def test_loop_route_keeps_outbound_distance() -> None:
    origin = _stop("A", 1.3500, 103.8500, "Bishan Int")
    mid = _stop("B", 1.3530, 103.9200, "Mid")
    dest = _stop("C", 1.3570, 103.9870, "Airport")
    graph = build_graph(
        [
            ("53", 1, 1, 0.0, origin),
            ("53", 1, 2, 10.0, mid),
            ("53", 1, 3, 26.0, dest),
            ("53", 1, 4, 52.0, origin),
        ]
    )
    options = plan_journeys(
        graph=graph,
        origin=(origin.lat, origin.lng),
        dest=(dest.lat, dest.lng),
        origin_stops=[(origin, 0)],
        dest_stops=[(dest, 0)],
    )
    bus = next(leg for leg in options[0]["legs"] if leg["kind"] == "bus")
    assert bus["stop_count"] == 2
    assert bus["duration_min"] == 65
    assert [stop["code"] for stop in bus["via_stops"]] == ["B", "C"]


def test_bus_leg_lists_each_stop_on_the_ride() -> None:
    graph, origin, dest, _transfer = _graph()
    options = plan_journeys(
        graph=graph,
        origin=(origin.lat, origin.lng),
        dest=(dest.lat, dest.lng),
        origin_stops=[(origin, 0)],
        dest_stops=[(dest, 0)],
    )
    bus = next(leg for leg in options[0]["legs"] if leg["kind"] == "bus")
    assert bus["service_no"] == "36"
    assert [stop["name"] for stop in bus["via_stops"]] == ["Mid", "Airport"]


def test_same_point_does_not_return_zero_minute_walk() -> None:
    graph, origin, dest, _transfer = _graph()
    options = plan_journeys(
        graph=graph,
        origin=(origin.lat, origin.lng),
        dest=(origin.lat, origin.lng),
        origin_stops=[(origin, 0)],
        dest_stops=[(origin, 0)],
    )
    assert options == []
