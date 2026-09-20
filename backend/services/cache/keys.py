PREFIX = "sg-busflow"


def arrivals_key(bus_stop_code: str) -> str:
    return f"{PREFIX}:arrivals:{bus_stop_code}"


def arrivals_last_key(bus_stop_code: str) -> str:
    return f"{PREFIX}:arrivals:{bus_stop_code}:last"


ARRIVALS_STALE_TTL_SECONDS = 15 * 60


STOPS_KEY = f"{PREFIX}:stops"
SERVICES_KEY = f"{PREFIX}:services"
WATCHED_STOPS_KEY = f"{PREFIX}:ws:watched-stops"
WATCH_COUNTS_KEY = f"{PREFIX}:ws:watch-counts"


def stop_channel(stop_code: str) -> str:
    return f"{PREFIX}:ws:stop:{stop_code}"


def service_channel(service_no: str) -> str:
    return f"{PREFIX}:ws:service:{service_no.upper()}"


def bus_channel(bus_id: str) -> str:
    return f"{PREFIX}:ws:bus:{bus_id.upper()}"


def live_pattern() -> str:
    return f"{PREFIX}:ws:*"
