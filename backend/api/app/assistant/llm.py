from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

import httpx

from app.core.config import get_settings


MISSING_KEY = (
    "BusFlow AI needs a server key (GROQ_API_KEY or GEMINI_API_KEY). Arrivals and journeys still work without it."
)


class LLMError(Exception):
    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict[str, Any]


@dataclass
class LLMTurn:
    content: str | None
    tool_calls: list[ToolCall] = field(default_factory=list)
    raw_assistant: dict[str, Any] | None = None


def _parse_arguments(raw: str | dict[str, Any] | None) -> dict[str, Any]:
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return raw
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _api_key(settings) -> str:
    getter = getattr(settings, "llm_api_key", None)
    if callable(getter):
        return str(getter() or "").strip()
    return str(
        getattr(settings, "groq_api_key", "")
        or getattr(settings, "gemini_api_key", "")
        or getattr(settings, "openai_api_key", "")
        or ""
    ).strip()


def _model(settings) -> str:
    getter = getattr(settings, "llm_model", None)
    if callable(getter):
        return str(getter() or "").strip() or "openai/gpt-oss-120b"
    return str(getattr(settings, "openai_model", "") or "openai/gpt-oss-120b").strip()


def _base_url(settings) -> str:
    getter = getattr(settings, "llm_base_url", None)
    if callable(getter):
        return str(getter() or "").rstrip("/")
    return str(getattr(settings, "openai_base_url", "") or "").rstrip("/")


def _provider(settings) -> str:
    getter = getattr(settings, "llm_provider", None)
    if callable(getter):
        return str(getter() or "")
    return ""


def _llm_error(response: httpx.Response, provider: str) -> str:
    try:
        payload = response.json()
        error = payload.get("error") or {}
        message = str(error.get("message") or payload.get("message") or "")
    except Exception:
        message = ""
    lowered = message.lower()
    name = "Groq" if provider == "groq" else "Gemini"
    if response.status_code in {401, 403}:
        return MISSING_KEY
    if response.status_code == 429:
        return f"{name} is rate-limited right now. Try again in a moment."
    if "no longer available" in lowered or response.status_code == 404:
        return f"{name} model is unavailable. Check OPENAI_MODEL in backend/api/.env."
    return "BusFlow AI is unavailable right now. Try again in a moment."


def complete_chat(messages: list[dict[str, Any]], tools: list[dict[str, Any]] | None) -> LLMTurn:
    settings = get_settings()
    api_key = _api_key(settings)
    if not api_key:
        raise LLMError(MISSING_KEY)
    payload: dict[str, Any] = {
        "model": _model(settings),
        "messages": messages,
        "temperature": 0.2,
    }
    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = "auto"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    url = _base_url(settings) + "/chat/completions"
    try:
        with httpx.Client(timeout=45.0) as client:
            response = client.post(url, headers=headers, json=payload)
    except httpx.HTTPError as exc:
        raise LLMError("BusFlow AI is unavailable right now. Try again in a moment.") from exc
    if response.status_code >= 400:
        raise LLMError(_llm_error(response, _provider(settings)))
    body = response.json()
    choice = (body.get("choices") or [{}])[0]
    message = choice.get("message") or {}
    tool_calls: list[ToolCall] = []
    for item in message.get("tool_calls") or []:
        function = item.get("function") or {}
        tool_calls.append(
            ToolCall(
                id=str(item.get("id") or f"call_{len(tool_calls)}"),
                name=str(function.get("name") or ""),
                arguments=_parse_arguments(function.get("arguments")),
            )
        )
    content = message.get("content")
    if isinstance(content, list):
        content = "".join(part.get("text", "") for part in content if isinstance(part, dict))
    return LLMTurn(
        content=str(content).strip() if content else None,
        tool_calls=[call for call in tool_calls if call.name],
        raw_assistant=message,
    )
