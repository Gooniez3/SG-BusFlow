from __future__ import annotations

import argparse

from workers.jobs import ingest_arrivals, ingest_static, run_arrivals_loop
from workers.runtime import runtime


def main() -> None:
    parser = argparse.ArgumentParser(description="SG BusFlow LTA ingestion workers")
    parser.add_argument("job", choices=["static", "arrivals", "arrivals-loop"])
    parser.add_argument(
        "--stops",
        help="comma-separated bus stop codes (overrides LTA_WATCH_STOPS)",
    )
    args = parser.parse_args()

    client, store, settings = runtime()
    stop_codes = (
        [code.strip() for code in args.stops.split(",") if code.strip()]
        if args.stops
        else settings.watch_stop_codes()
    )

    try:
        if args.job == "static":
            ingest_static(client, store, settings)
        elif args.job == "arrivals":
            ingest_arrivals(client, store, settings, stop_codes)
        else:
            run_arrivals_loop(client, store, settings, stop_codes)
    finally:
        client.close()


if __name__ == "__main__":
    main()
