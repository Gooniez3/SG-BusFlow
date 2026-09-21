from __future__ import annotations

import json
from typing import Any
from urllib.parse import urlencode

from redis import Redis
from sqlalchemy.orm import Session

from app.journey.service import JourneyPlanError, compose_journey, live_for_stops
from app.repositories.stops import find_nearby_stops, get_stop_by_code, search_stops
from services.cache.keys import SERVICES_KEY

TOOL_DEFINITIONS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "search_stops",
            "description": (
                "Search Singapore bus stops by name, road, or 5-digit code. "
                "If q is empty and lat/lng are set, return nearby stops instead."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "q": {"type": "string", "description": "Stop name, road, or code"},
                    "lat": {"type": "number"},
                    "lng": {"type": "number"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_services",
            "description": "Search bus service numbers, for example 36 or 230M.",
            "parameters": {
                "type": "object",
                "properties": {"q": {"type": "string", "description": "Service number fragment"}},
                "required": ["q"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_stop_arrivals",
            "description": (
                "Live arrival minutes for a bus stop from BusFlow cache only. "
                "Never invent times. Use context stop_code when the user says this stop."
            ),
            "parameters": {
                "type": "object",
                "properties": {"stop_code": {"type": "string"}},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_service",
            "description": "Bus service directions and terminals from cached LTA static data.",
            "parameters": {
                "type": "object",
                "properties": {"service_no": {"type": "string"}},
                "required": ["service_no"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "plan_journey",
            "description": (
                "Plan a bus-only journey using the BusFlow RAPTOR planner. "
                "Resolve place names with search_stops first, then pass coordinates. "
                "Use the user location as origin when they say from here. "
                "prefer=fewest_transfers only if they ask for fewer changes."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "from_lat": {"type": "number"},
                    "from_lng": {"type": "number"},
                    "to_lat": {"type": "number"},
                    "to_lng": {"type": "number"},
                    "from_stop": {"type": "string"},
                    "to_stop": {"type": "string"},
                    "from_label": {"type": "string"},
                    "to_label": {"type": "string"},
                    "prefer": {
                        "type": "string",
                        "enum": ["fastest", "fewest_transfers"],
                    },
                },
                "required": ["from_lat", "from_lng", "to_lat", "to_lng"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_live_bus",
            "description": (
                "Live buses for a service at a stop, from cache only. "
                "Requires a stop (argument or user context)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "service_no": {"type": "string"},
                    "stop_code": {"type": "string"},
                },
                "required": ["service_no"],
            },
        },
    },
]


def _stop_brief(stop, distance_m: float | int | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "code": stop.code,
        "name": stop.name,
        "road_name": stop.road_name,
        "lat": float(stop.latitude),
        "lng": float(stop.longitude),
    }
    if distance_m is not None:
        payload["distance_m"] = round(float(distance_m))
    return payload


def _load_services(redis: Redis) -> list[dict[str, Any]]:
    raw = redis.get(SERVICES_KEY)
    if raw is None:
        return []
    payload = json.loads(raw)
    return payload if isinstance(payload, list) else []


def _leg_summary(option: dict[str, Any]) -> str:
    parts: list[str] = []
    for leg in option.get("legs") or []:
        if leg.get("kind") == "walk":
            parts.append(f"Walk {leg.get('duration_min', 0)} min")
        elif leg.get("service_no"):
            parts.append(f"Bus {leg['service_no']}")
    return " → ".join(parts)


def _compact_option(option: dict[str, Any]) -> dict[str, Any]:
    legs = []
    for leg in option.get("legs") or []:
        if leg.get("kind") == "walk":
            legs.append(
                {
                    "kind": "walk",
                    "duration_min": leg.get("duration_min"),
                    "distance_m": leg.get("distance_m"),
                    "from": leg.get("from_label"),
                    "to": leg.get("to_label"),
                }
            )
            continue
        from_stop = leg.get("from_stop") or {}
        to_stop = leg.get("to_stop") or {}
        legs.append(
            {
                "kind": "bus",
                "service_no": leg.get("service_no"),
                "duration_min": leg.get("duration_min"),
                "live_minutes": leg.get("live_minutes"),
                "stop_count": leg.get("stop_count"),
                "from": from_stop.get("name") or leg.get("from_label"),
                "from_code": from_stop.get("code"),
                "to": to_stop.get("name") or leg.get("to_label"),
                "to_code": to_stop.get("code"),
            }
        )
    first_live = next(
        (leg.get("live_minutes") for leg in option.get("legs") or [] if leg.get("kind") == "bus"),
        None,
    )
    return {
        "id": option.get("id"),
        "duration_min": option.get("duration_min"),
        "walk_min": option.get("walk_min"),
        "wait_min": option.get("wait_min"),
        "transfers": option.get("transfers"),
        "live": option.get("live"),
        "stale": option.get("stale"),
        "live_minutes": first_live,
        "summary": _leg_summary(option),
        "legs": legs,
    }


def _journey_href(plan: dict[str, Any], option: dict[str, Any], args: dict[str, Any]) -> str:
    params: dict[str, Any] = {
        "from_lat": plan["from_lat"],
        "from_lng": plan["from_lng"],
        "to_lat": plan["to_lat"],
        "to_lng": plan["to_lng"],
        "from_label": plan.get("from_label") or "Current location",
        "to_label": plan.get("to_label") or "Destination",
        "option": option.get("id") or "",
    }
    from_stop = args.get("from_stop")
    to_stop = args.get("to_stop")
    if from_stop:
        params["from_stop"] = from_stop
    if to_stop:
        params["to_stop"] = to_stop
    return f"/journey/detail?{urlencode(params)}"


def _search_stops_tool(db: Session, args: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
    query = str(args.get("q") or "").strip()
    lat = args.get("lat", context.get("lat"))
    lng = args.get("lng", context.get("lng"))
    try:
        lat_f = float(lat) if lat is not None else None
        lng_f = float(lng) if lng is not None else None
    except (TypeError, ValueError):
        lat_f = lng_f = None
    if not query:
        if lat_f is None or lng_f is None:
            return {"error": "Provide a stop name or a location to search nearby."}
        nearby = find_nearby_stops(db, lat=lat_f, lng=lng_f, radius_m=1000, limit=8)
        return {
            "query": "",
            "nearby": True,
            "stops": [_stop_brief(stop, distance_m) for stop, distance_m in nearby],
        }
    rows = search_stops(db, query, lat=lat_f, lng=lng_f, limit=8)
    return {
        "query": query,
        "nearby": False,
        "stops": [_stop_brief(stop, distance_m) for stop, distance_m in rows],
    }


def _search_services_tool(redis: Redis, args: dict[str, Any]) -> dict[str, Any]:
    needle = str(args.get("q") or "").strip().upper()
    if not needle:
        return {"error": "Provide a service number to search."}
    services = _load_services(redis)
    if not services:
        return {"error": "Service data is not cached yet."}
    seen: dict[str, dict[str, Any]] = {}
    for item in services:
        service_no = str(item.get("service_no", "")).upper()
        if needle not in service_no or service_no in seen:
            continue
        seen[service_no] = {
            "service_no": service_no,
            "operator": item.get("operator"),
            "origin_code": item.get("origin_code"),
            "destination_code": item.get("destination_code"),
        }
        if len(seen) >= 12:
            break
    return {"query": needle, "services": list(seen.values())}


def _get_service_tool(redis: Redis, args: dict[str, Any]) -> dict[str, Any]:
    service_no = str(args.get("service_no") or "").strip().upper()
    if not service_no:
        return {"error": "Provide a service number."}
    matches = [
        item
        for item in _load_services(redis)
        if str(item.get("service_no", "")).upper() == service_no
    ]
    if not matches:
        return {"error": f"Bus service {service_no} was not found in cached data."}
    return {
        "service_no": service_no,
        "directions": [
            {
                "direction": item.get("direction"),
                "operator": item.get("operator"),
                "origin_code": item.get("origin_code"),
                "destination_code": item.get("destination_code"),
                "loop_desc": item.get("loop_desc"),
            }
            for item in matches
        ],
    }


def _get_stop_arrivals_tool(db: Session, redis: Redis, args: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
    code = str(args.get("stop_code") or context.get("stop_code") or "").strip()
    if not code:
        return {"error": "Need a bus stop code for arrivals."}
    stop = get_stop_by_code(db, code)
    if stop is None:
        return {"error": "Bus stop not found."}
    live = live_for_stops(redis, [code])
    cached = live.get(code)
    if not cached:
        return {
            "stop_code": code,
            "stop_name": stop.name,
            "stale": False,
            "services": [],
            "note": "No cached live arrivals for this stop yet.",
        }
    services = []
    for item in cached.get("services") or []:
        minutes = [arrival.get("minutes") for arrival in item.get("arrivals") or [] if arrival.get("minutes") is not None]
        services.append(
            {
                "service_no": item.get("service_no"),
                "minutes": minutes[:3],
            }
        )
    return {
        "stop_code": code,
        "stop_name": stop.name,
        "stale": bool(cached.get("stale")),
        "services": services,
    }


def _plan_journey_tool(db: Session, redis: Redis, args: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
    try:
        from_lat = float(args.get("from_lat", context.get("lat")))
        from_lng = float(args.get("from_lng", context.get("lng")))
        to_lat = float(args["to_lat"])
        to_lng = float(args["to_lng"])
    except (KeyError, TypeError, ValueError):
        return {"error": "plan_journey needs from and to coordinates. Search stops first."}
    try:
        plan = compose_journey(
            db,
            redis,
            from_lat=from_lat,
            from_lng=from_lng,
            to_lat=to_lat,
            to_lng=to_lng,
            from_stop=args.get("from_stop") or None,
            to_stop=args.get("to_stop") or None,
            from_label=str(args.get("from_label") or context.get("stop_name") or "Current location"),
            to_label=str(args.get("to_label") or "Destination"),
            prefer=str(args.get("prefer") or "fastest"),
        )
    except JourneyPlanError as exc:
        return {"error": exc.detail}
    options = [_compact_option(option) for option in plan.get("options") or []]
    compact = {
        "from_label": plan["from_label"],
        "to_label": plan["to_label"],
        "from_lat": plan["from_lat"],
        "from_lng": plan["from_lng"],
        "to_lat": plan["to_lat"],
        "to_lng": plan["to_lng"],
        "from_stop": args.get("from_stop"),
        "to_stop": args.get("to_stop"),
        "network_ready": plan.get("network_ready"),
        "options": options,
    }
    compact["hrefs"] = [_journey_href(plan, option, args) for option in options]
    return compact


def _get_live_bus_tool(db: Session, redis: Redis, args: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
    service_no = str(args.get("service_no") or context.get("service_no") or "").strip().upper()
    code = str(args.get("stop_code") or context.get("stop_code") or "").strip()
    if not service_no:
        return {"error": "Need a bus service number."}
    if not code:
        return {"error": "Need a stop to look up a live bus."}
    stop = get_stop_by_code(db, code)
    if stop is None:
        return {"error": "Bus stop not found."}
    live = live_for_stops(redis, [code]).get(code)
    if not live:
        return {
            "service_no": service_no,
            "stop_code": code,
            "stop_name": stop.name,
            "buses": [],
            "note": "No cached live arrivals for this stop yet.",
        }
    match = next(
        (item for item in live.get("services") or [] if str(item.get("service_no", "")).upper() == service_no),
        None,
    )
    buses = []
    for arrival in (match or {}).get("arrivals") or []:
        buses.append(
            {
                "minutes": arrival.get("minutes"),
                "has_gps": arrival.get("latitude") is not None and arrival.get("longitude") is not None,
                "load": arrival.get("load"),
            }
        )
    return {
        "service_no": service_no,
        "stop_code": code,
        "stop_name": stop.name,
        "stale": bool(live.get("stale")),
        "buses": buses,
    }


def execute_tool(
    name: str,
    arguments: dict[str, Any],
    *,
    db: Session,
    redis: Redis,
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    ctx = context or {}
    args = arguments or {}
    if name == "search_stops":
        return _search_stops_tool(db, args, ctx)
    if name == "search_services":
        return _search_services_tool(redis, args)
    if name == "get_service":
        return _get_service_tool(redis, args)
    if name == "get_stop_arrivals":
        return _get_stop_arrivals_tool(db, redis, args, ctx)
    if name == "plan_journey":
        return _plan_journey_tool(db, redis, args, ctx)
    if name == "get_live_bus":
        return _get_live_bus_tool(db, redis, args, ctx)
    return {"error": f"Unknown tool {name}"}


def cards_from_tools(trace: list[tuple[str, dict[str, Any]]]) -> list[dict[str, Any]]:
    journeys = [
        payload
        for name, payload in trace
        if name == "plan_journey" and isinstance(payload, dict) and payload.get("options")
    ]
    if journeys:
        return _journey_cards(journeys[-1])[:3]

    cards: list[dict[str, Any]] = []
    for name, payload in trace:
        if not isinstance(payload, dict) or payload.get("error"):
            continue
        if name == "get_stop_arrivals":
            services = payload.get("services") or []
            preview = ", ".join(
                f"{item.get('service_no')} {item['minutes'][0]} min"
                for item in services
                if item.get("minutes")
            )
            if not preview:
                continue
            cards.append(
                {
                    "kind": "arrivals",
                    "title": payload.get("stop_name") or payload.get("stop_code"),
                    "subtitle": preview,
                    "href": f"/stops/{payload.get('stop_code')}",
                    "stop_code": payload.get("stop_code"),
                }
            )
        elif name == "search_stops":
            nearby = bool(payload.get("nearby"))
            added = 0
            for stop in payload.get("stops") or []:
                distance = stop.get("distance_m")
                if nearby and (distance is None or float(distance) > 1200):
                    continue
                cards.append(
                    {
                        "kind": "stop",
                        "title": stop.get("name"),
                        "subtitle": _stop_subtitle(stop.get("code"), distance if nearby else None),
                        "href": f"/stops/{stop.get('code')}",
                        "stop_code": stop.get("code"),
                    }
                )
                added += 1
                if added >= 4:
                    break
        elif name == "search_services":
            for service in (payload.get("services") or [])[:4]:
                cards.append(
                    {
                        "kind": "service",
                        "title": str(service.get("service_no")),
                        "subtitle": service.get("operator") or "Bus service",
                        "href": f"/search?q={service.get('service_no')}",
                        "service_no": service.get("service_no"),
                    }
                )
        elif name == "get_service":
            cards.append(
                {
                    "kind": "service",
                    "title": str(payload.get("service_no")),
                    "subtitle": "Bus service",
                    "href": f"/search?q={payload.get('service_no')}",
                    "service_no": payload.get("service_no"),
                }
            )
        elif name == "get_live_bus":
            buses = payload.get("buses") or []
            first = buses[0]["minutes"] if buses and buses[0].get("minutes") is not None else None
            if first is None:
                continue
            cards.append(
                {
                    "kind": "live_bus",
                    "title": f"Bus {payload.get('service_no')}",
                    "subtitle": "Arriving" if first <= 0 else f"{first} min",
                    "href": f"/live/{payload.get('service_no')}?stop={payload.get('stop_code')}",
                    "service_no": payload.get("service_no"),
                    "stop_code": payload.get("stop_code"),
                    "live_minutes": first,
                }
            )
    return cards[:4]


def _stop_subtitle(code: Any, distance_m: Any) -> str:
    parts = [str(code)] if code else []
    if distance_m is not None:
        metres = int(round(float(distance_m)))
        parts.append(f"{metres} m" if metres < 1000 else f"{metres / 1000:.1f} km")
    return " · ".join(parts)


def _journey_cards(payload: dict[str, Any]) -> list[dict[str, Any]]:
    cards: list[dict[str, Any]] = []
    hrefs = payload.get("hrefs") or []
    for index, option in enumerate(payload.get("options") or []):
        href = hrefs[index] if index < len(hrefs) else None
        live_minutes = option.get("live_minutes")
        subtitle_parts = [option.get("summary") or ""]
        if live_minutes is not None:
            subtitle_parts.append("Next bus arriving" if live_minutes <= 0 else f"Next bus {live_minutes} min")
        cards.append(
            {
                "kind": "journey",
                "title": f"{option.get('duration_min')} min",
                "subtitle": " · ".join(part for part in subtitle_parts if part),
                "href": href,
                "duration_min": option.get("duration_min"),
                "transfers": option.get("transfers"),
                "live_minutes": live_minutes,
            }
        )
    return cards
