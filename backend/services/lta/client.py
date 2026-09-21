from __future__ import annotations

import logging
import time

import httpx

logger = logging.getLogger("sg-busflow.lta")


class LTAError(Exception):
    """Base error for LTA DataMall access."""


class LTAConfigError(LTAError):
    """Raised when the client is missing required configuration."""


class LTARequestError(LTAError):
    """Raised when LTA DataMall cannot be reached or returns an error."""

    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class LTAClient:
    """Thin HTTP client for LTA DataMall. Route handlers must not call this API directly."""

    DEFAULT_BASE_URL = "https://datamall2.mytransport.sg/ltaodataservice"
    PAGE_SIZE = 500

    def __init__(
        self,
        account_key: str,
        *,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 10.0,
        client: httpx.Client | None = None,
        retries: int = 2,
        retry_backoff_seconds: float = 0.25,
    ) -> None:
        if not account_key.strip():
            raise LTAConfigError("LTA_ACCOUNT_KEY is not set")

        self._account_key = account_key
        self._base_url = base_url.rstrip("/")
        self._owns_client = client is None
        self._client = client or httpx.Client(timeout=timeout)
        self._retries = max(0, retries)
        self._retry_backoff_seconds = retry_backoff_seconds

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def __enter__(self) -> LTAClient:
        return self

    def __exit__(self, *args: object) -> None:
        self.close()

    def get(self, path: str, params: dict[str, str | int] | None = None) -> dict[str, object]:
        url = f"{self._base_url}/{path.lstrip('/')}"
        attempts = self._retries + 1
        last_error: LTARequestError | None = None
        for attempt in range(attempts):
            try:
                response = self._client.get(
                    url,
                    params=params,
                    headers={
                        "AccountKey": self._account_key,
                        "Accept": "application/json",
                    },
                )
                if response.status_code >= 500 and attempt < attempts - 1:
                    logger.warning(
                        "LTA DataMall HTTP %s on %s; retrying",
                        response.status_code,
                        path,
                    )
                    time.sleep(self._retry_backoff_seconds * (attempt + 1))
                    continue
                response.raise_for_status()
            except httpx.TimeoutException as exc:
                last_error = LTARequestError("LTA DataMall request timed out")
                last_error.__cause__ = exc
                if attempt < attempts - 1:
                    time.sleep(self._retry_backoff_seconds * (attempt + 1))
                    continue
                raise last_error from exc
            except httpx.HTTPStatusError as exc:
                raise LTARequestError(
                    f"LTA DataMall returned HTTP {exc.response.status_code}",
                    status_code=exc.response.status_code,
                ) from exc
            except httpx.HTTPError as exc:
                last_error = LTARequestError("LTA DataMall is unavailable")
                last_error.__cause__ = exc
                if attempt < attempts - 1:
                    time.sleep(self._retry_backoff_seconds * (attempt + 1))
                    continue
                raise last_error from exc

            payload = response.json()
            if not isinstance(payload, dict):
                raise LTARequestError("LTA DataMall returned an unexpected payload")
            return payload
        raise last_error or LTARequestError("LTA DataMall is unavailable")

    def get_paginated(self, path: str) -> list[dict[str, object]]:
        records: list[dict[str, object]] = []
        skip = 0
        while True:
            payload = self.get(path, params={"$skip": skip})
            page = payload.get("value") or []
            if not isinstance(page, list):
                raise LTARequestError("LTA DataMall returned an unexpected page")
            records.extend(page)
            if len(page) < self.PAGE_SIZE:
                break
            skip += self.PAGE_SIZE
        return records
