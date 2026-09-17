PREFIX = "sg-busflow"


def arrivals_key(bus_stop_code: str) -> str:
    return f"{PREFIX}:arrivals:{bus_stop_code}"


STOPS_KEY = f"{PREFIX}:stops"
SERVICES_KEY = f"{PREFIX}:services"
