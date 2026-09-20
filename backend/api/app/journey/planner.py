from __future__ import annotations

from dataclasses import dataclass
from typing import Any

WALK_SPEED_M_PER_MIN = 80
DEFAULT_WAIT_MIN = 4
TRANSFER_WAIT_MIN = 5
MAX_TRANSFERS = 2
MAX_OPTIONS = 5
MAX_WALK_ONLY_M = 800
MAX_PER_STOP = 3


@dataclass(frozen=True)
class StopInfo:
    code: str
    name: str
    road_name: str | None
    lat: float
    lng: float


@dataclass
class RoutePattern:
    service_no: str
    direction: int
    ordered: list[str]
    km: list[float | None]

    def board_index(self, stop_code: str) -> int | None:
        try:
            return self.ordered.index(stop_code)
        except ValueError:
            return None

    def later_boardings(self, stop_code: str) -> list[tuple[int, int, str]]:
        start = self.board_index(stop_code)
        if start is None:
            return []
        later: list[tuple[int, int, str]] = []
        for index in range(start + 1, len(self.ordered)):
            code = self.ordered[index]
            if code == stop_code:
                continue
            later.append((start, index, code))
        return later


@dataclass
class JourneyGraph:
    stops: dict[str, StopInfo]
    routes: list[RoutePattern]
    at_stop: dict[str, list[int]]


@dataclass
class Candidate:
    time_min: float
    transfers: int
    last_service: str | None
    legs: tuple[tuple[Any, ...], ...]
    live: bool = False
    stale: bool = False


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    from math import asin, cos, radians, sin, sqrt

    radius = 6_371_000
    phi1, phi2 = radians(lat1), radians(lat2)
    d_phi = radians(lat2 - lat1)
    d_lambda = radians(lng2 - lng1)
    a = sin(d_phi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(d_lambda / 2) ** 2
    return 2 * radius * asin(sqrt(min(1.0, a)))


def walk_minutes(distance_m: float) -> int:
    if distance_m <= 0:
        return 0
    return max(1, round(distance_m / WALK_SPEED_M_PER_MIN))


def ride_minutes(route: RoutePattern, from_index: int, to_index: int) -> int:
    if to_index <= from_index:
        return 2
    start = route.km[from_index] if from_index < len(route.km) else None
    end = route.km[to_index] if to_index < len(route.km) else None
    if start is not None and end is not None and end > start:
        return max(2, round((end - start) * 2.5))
    return max(2, (to_index - from_index) * 2)


def live_wait(
    live: dict[str, dict[str, Any]] | None,
    stop_code: str,
    service_no: str,
) -> tuple[int | None, bool]:
    if not live:
        return None, False
    payload = live.get(stop_code)
    if not payload:
        return None, False
    stale = bool(payload.get("stale"))
    needle = service_no.upper()
    for service in payload.get("services") or []:
        if str(service.get("service_no", "")).upper() != needle:
            continue
        arrivals = service.get("arrivals") or []
        if not arrivals:
            return None, stale
        minutes = arrivals[0].get("minutes")
        if minutes is None:
            return None, stale
        return int(minutes), stale
    return None, stale


def _better(left: Candidate, right: Candidate) -> bool:
    if left.transfers != right.transfers:
        return left.transfers < right.transfers
    return left.time_min + 0.4 < right.time_min


def _leg_signature(candidate: Candidate) -> str:
    parts: list[str] = []
    for leg in candidate.legs:
        if leg[0] == "bus":
            parts.append(f"{leg[1]}:{leg[6]}:{leg[7]}")
        elif leg[0] == "walk":
            parts.append(f"walk:{leg[5]}")
    return ">".join(parts)


def _keep_candidate(bucket: list[Candidate], candidate: Candidate) -> bool:
    signature = _leg_signature(candidate)
    if any(_leg_signature(item) == signature for item in bucket):
        return False
    dominated = any(not _better(candidate, item) and item.transfers <= candidate.transfers and item.time_min <= candidate.time_min for item in bucket)
    if dominated:
        return False
    bucket.append(candidate)
    bucket.sort(key=lambda item: (item.transfers, item.time_min))
    del bucket[MAX_PER_STOP:]
    return candidate in bucket


def _stop_payload(stop: StopInfo) -> dict[str, Any]:
    return {
        "code": stop.code,
        "name": stop.name,
        "road_name": stop.road_name,
        "latitude": stop.lat,
        "longitude": stop.lng,
    }


def _via_stops(graph: JourneyGraph, route_index: int, board_i: int, alight_i: int) -> list[dict[str, Any]]:
    if route_index < 0 or route_index >= len(graph.routes):
        return []
    route = graph.routes[route_index]
    codes = route.ordered[board_i + 1 : alight_i + 1]
    return [_stop_payload(graph.stops[code]) for code in codes if code in graph.stops]


def _option_from_candidate(
    candidate: Candidate,
    graph: JourneyGraph,
    dest_walk_m: int,
    dest_label: str,
) -> dict[str, Any]:
    legs: list[dict[str, Any]] = []
    walk_min = 0
    wait_min = 0
    for leg in candidate.legs:
        kind = leg[0]
        if kind == "walk":
            _, duration, distance_m, from_label, to_label, to_code = leg
            walk_min += int(duration)
            legs.append(
                {
                    "kind": "walk",
                    "duration_min": int(duration),
                    "distance_m": int(distance_m),
                    "from_label": from_label,
                    "to_label": to_label,
                    "to_stop": _stop_payload(graph.stops[to_code]) if to_code else None,
                }
            )
            continue
        _, service_no, duration, wait, live_minutes, stop_count, from_code, to_code, board_i, alight_i, route_index = leg
        wait_min += int(wait)
        legs.append(
            {
                "kind": "bus",
                "service_no": service_no,
                "duration_min": int(duration),
                "wait_min": int(wait),
                "live_minutes": live_minutes,
                "stop_count": int(stop_count),
                "from_stop": _stop_payload(graph.stops[from_code]),
                "to_stop": _stop_payload(graph.stops[to_code]),
                "via_stops": _via_stops(graph, int(route_index), int(board_i), int(alight_i)),
            }
        )
    if dest_walk_m > 0:
        duration = walk_minutes(dest_walk_m)
        walk_min += duration
        last_code = None
        for leg in reversed(candidate.legs):
            if leg[0] == "bus":
                last_code = leg[7]
                break
            if leg[0] == "walk":
                last_code = leg[5]
                break
        from_label = graph.stops[last_code].name if last_code and last_code in graph.stops else "Alight"
        legs.append(
            {
                "kind": "walk",
                "duration_min": duration,
                "distance_m": dest_walk_m,
                "from_label": from_label,
                "to_label": dest_label,
                "to_stop": None,
            }
        )
    duration_min = max(1, round(candidate.time_min) + (walk_minutes(dest_walk_m) if dest_walk_m else 0))
    signature = ">".join(
        f"{leg['service_no']}:{leg['from_stop']['code']}:{leg['to_stop']['code']}"
        if leg["kind"] == "bus"
        else f"walk:{leg['distance_m']}"
        for leg in legs
    )
    return {
        "id": signature,
        "duration_min": duration_min,
        "walk_min": walk_min,
        "wait_min": wait_min,
        "transfers": candidate.transfers,
        "live": candidate.live,
        "stale": candidate.stale,
        "legs": legs,
    }


def plan_journeys(
    *,
    graph: JourneyGraph,
    origin: tuple[float, float],
    dest: tuple[float, float],
    origin_stops: list[tuple[StopInfo, int]],
    dest_stops: list[tuple[StopInfo, int]],
    live: dict[str, dict[str, Any]] | None = None,
    origin_label: str = "Origin",
    dest_label: str = "Destination",
    max_options: int = MAX_OPTIONS,
) -> list[dict[str, Any]]:
    best: dict[str, list[Candidate]] = {}

    for stop, walk_m in origin_stops:
        duration = walk_minutes(walk_m)
        legs: tuple[tuple[Any, ...], ...] = ()
        if walk_m > 0:
            legs = (("walk", duration, walk_m, origin_label, stop.name, stop.code),)
        best[stop.code] = [Candidate(duration, 0, None, legs)]

    marked = set(best)
    for _round in range(MAX_TRANSFERS + 1):
        nxt: set[str] = set()
        for stop_code in list(marked):
            for current in list(best.get(stop_code, [])):
                for route_index in graph.at_stop.get(stop_code, []):
                    route = graph.routes[route_index]
                    if current.last_service == route.service_no:
                        continue
                    live_minutes, stale = live_wait(live, stop_code, route.service_no)
                    wait = (
                        live_minutes
                        if live_minutes is not None
                        else (DEFAULT_WAIT_MIN if current.last_service is None else TRANSFER_WAIT_MIN)
                    )
                    later = route.later_boardings(stop_code)
                    if not later:
                        continue
                    transfers = current.transfers if current.last_service is None else current.transfers + 1
                    if transfers > MAX_TRANSFERS:
                        continue
                    for board_i, alight_i, alight in later:
                        ride = ride_minutes(route, board_i, alight_i)
                        stop_count = max(1, alight_i - board_i)
                        bus_leg = (
                            "bus",
                            route.service_no,
                            ride,
                            wait,
                            live_minutes,
                            stop_count,
                            stop_code,
                            alight,
                            board_i,
                            alight_i,
                            route_index,
                        )
                        candidate = Candidate(
                            time_min=current.time_min + wait + ride,
                            transfers=transfers,
                            last_service=route.service_no,
                            legs=current.legs + (bus_leg,),
                            live=current.live or live_minutes is not None,
                            stale=current.stale or stale,
                        )
                        if _keep_candidate(best.setdefault(alight, []), candidate):
                            nxt.add(alight)
        marked = nxt
        if not marked:
            break

    options: list[dict[str, Any]] = []
    seen: set[str] = set()
    for stop, walk_m in dest_stops:
        for candidate in best.get(stop.code, []):
            if not any(leg[0] == "bus" for leg in candidate.legs):
                continue
            option = _option_from_candidate(candidate, graph, walk_m, dest_label)
            if option["id"] in seen:
                continue
            seen.add(option["id"])
            options.append(option)

    direct_m = haversine_m(origin[0], origin[1], dest[0], dest[1])
    if 0 < direct_m <= MAX_WALK_ONLY_M:
        duration = walk_minutes(direct_m)
        walk_id = f"walk:{round(direct_m)}"
        if walk_id not in seen:
            options.append(
                {
                    "id": walk_id,
                    "duration_min": duration,
                    "walk_min": duration,
                    "wait_min": 0,
                    "transfers": 0,
                    "live": False,
                    "stale": False,
                    "legs": [
                        {
                            "kind": "walk",
                            "duration_min": duration,
                            "distance_m": round(direct_m),
                            "from_label": origin_label,
                            "to_label": dest_label,
                            "to_stop": None,
                        }
                    ],
                }
            )

    options.sort(key=lambda item: (item["duration_min"], item["transfers"], item["walk_min"]))
    return options[:max_options]


def build_graph(
    rows: list[tuple[str, int, int, float | None, StopInfo]],
) -> JourneyGraph:
    routes: list[RoutePattern] = []
    grouped: dict[tuple[str, int], list[tuple[int, float | None, StopInfo]]] = {}
    stops: dict[str, StopInfo] = {}
    for service_no, direction, sequence, distance_km, stop in rows:
        stops[stop.code] = stop
        grouped.setdefault((service_no, direction), []).append((sequence, distance_km, stop))
    at_stop: dict[str, list[int]] = {}
    for (service_no, direction), items in grouped.items():
        items.sort(key=lambda item: item[0])
        ordered = [item[2].code for item in items]
        km = [item[1] for item in items]
        index = len(routes)
        routes.append(RoutePattern(service_no, direction, ordered, km))
        seen_codes: set[str] = set()
        for code in ordered:
            if code in seen_codes:
                continue
            seen_codes.add(code)
            at_stop.setdefault(code, []).append(index)
    return JourneyGraph(stops=stops, routes=routes, at_stop=at_stop)
