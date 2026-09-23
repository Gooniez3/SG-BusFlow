from __future__ import annotations

import argparse
import logging
import time

from workers.runtime import runtime
from workers.jobs import ingest_arrivals, ingest_static, run_arrivals_loop

logger = logging.getLogger("workers")


def main() -> None:
    parser = argparse.ArgumentParser(description="SG BusFlow LTA ingestion workers")
    parser.add_argument("job", choices=["static", "arrivals", "arrivals-loop"])
    parser.add_argument(
        "--stops",
        help="comma-separated bus stop codes (overrides LTA_WATCH_STOPS)",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    from app.core.config import get_settings

    if not get_settings().lta_account_key.strip():
        logger.error("LTA_ACCOUNT_KEY is not set; worker is idle until it is configured")
        while True:
            time.sleep(30)

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
