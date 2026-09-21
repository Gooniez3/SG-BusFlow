from __future__ import annotations

import json
import re
from typing import Any

from redis import Redis
from sqlalchemy.orm import Session

from app.assistant.llm import LLMError, complete_chat
from app.assistant.tools import TOOL_DEFINITIONS, cards_from_tools, execute_tool

SYSTEM_PROMPT = """You are BusFlow AI, a Singapore bus transit copilot inside the SG BusFlow app.

Rules:
- Use tools for any stop, service, arrival, live bus, or journey fact. Never invent times, routes, waits, or GPS.
- Bus only. Do not offer MRT, trains, or taxis as journey options.
- If a tool returns empty or an error, say that BusFlow does not have that data. Do not guess.
- Use the provided user context as defaults (this stop, this service, current location, current journey).
- To plan a trip, search_stops to resolve place names, then plan_journey with coordinates. Use context lat/lng as origin when the user says from here or gives no origin.
- Set prefer=fewest_transfers only when the user asks for fewer changes.
- Arrivals come from cache. If none are cached, say live times are not available yet.

How you write:
- Plain text only. No markdown, no **bold**, no # headings, no backticks, no numbered lists, no bullet lists, no tables.
- One or two short sentences. The app already shows tappable cards for stops and journeys.
- Do not list stops, buses, or step-by-step directions. Point the user at the cards instead.
- Examples: "Nearest stops are around Blk 27. Open a card for that stop." "About 72 min with 2 transfers. Tap View journey for the steps."
"""

MAX_TOOL_ROUNDS = 4
MAX_MESSAGES = 20


def _context_message(context: dict[str, Any] | None) -> str | None:
    if not context:
        return None
    lines = ["Current user context (defaults only — still call tools for live facts):"]
    if context.get("stop_code"):
        name = context.get("stop_name") or ""
        lines.append(f"- stop: {context['stop_code']} {name}".strip())
    if context.get("service_no"):
        lines.append(f"- service: {context['service_no']}")
    if context.get("lat") is not None and context.get("lng") is not None:
        lines.append(f"- location: {context['lat']}, {context['lng']}")
    journey = context.get("journey")
    if isinstance(journey, dict) and (journey.get("from_label") or journey.get("summary")):
        lines.append(
            "- journey: "
            + " → ".join(part for part in [journey.get("from_label"), journey.get("to_label")] if part)
            + (f" ({journey.get('duration_min')} min)" if journey.get("duration_min") is not None else "")
            + (f"; {journey.get('summary')}" if journey.get("summary") else "")
        )
        if journey.get("from_lat") is not None:
            lines.append(
                f"- journey coords: {journey.get('from_lat')},{journey.get('from_lng')} -> {journey.get('to_lat')},{journey.get('to_lng')}"
            )
    if len(lines) == 1:
        return None
    return "\n".join(lines)


def _assistant_record(turn) -> dict[str, Any]:
    if turn.raw_assistant:
        return dict(turn.raw_assistant)
    if turn.tool_calls:
        return {
            "role": "assistant",
            "content": turn.content,
            "tool_calls": [
                {
                    "id": call.id,
                    "type": "function",
                    "function": {"name": call.name, "arguments": json.dumps(call.arguments)},
                }
                for call in turn.tool_calls
            ],
        }
    return {"role": "assistant", "content": turn.content or ""}


def _plain_reply(text: str, limit: int = 220) -> str:
    cleaned = text.replace("\r\n", "\n")
    cleaned = re.sub(r"```[\s\S]*?```", " ", cleaned)
    cleaned = re.sub(r"`([^`]+)`", r"\1", cleaned)
    cleaned = re.sub(r"^#{1,6}\s*", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"^\s*-{3,}\s*$", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"\*\*([^*]+)\*\*", r"\1", cleaned)
    cleaned = re.sub(r"__([^_]+)__", r"\1", cleaned)
    cleaned = re.sub(r"\*([^*]+)\*", r"\1", cleaned)
    cleaned = re.sub(r"^[-*•]\s+", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"^\d+\.\s+", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"[*_#`]+", "", cleaned)
    cleaned = re.sub(r"[ \t]+\n", "\n", cleaned)
    cleaned = re.sub(r"\n{2,}", "\n", cleaned)
    cleaned = re.sub(r"[ \t]{2,}", " ", cleaned).strip()
    first_para = next((line.strip() for line in cleaned.split("\n") if line.strip()), cleaned)
    sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+", first_para) if part.strip()]
    clipped = " ".join(sentences[:2]).strip() or first_para
    if len(clipped) > limit:
        clipped = clipped[: limit - 1].rsplit(" ", 1)[0].rstrip(".,;:") + "."
    return clipped


def run_chat(
    db: Session,
    redis: Redis,
    *,
    messages: list[dict[str, str]],
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    trimmed = [item for item in messages if item.get("role") in {"user", "assistant"} and item.get("content")]
    if not trimmed:
        raise LLMError("Send a question about a stop, bus, or journey.")
    history: list[dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    context_text = _context_message(context)
    if context_text:
        history.append({"role": "system", "content": context_text})
    history.extend(trimmed[-MAX_MESSAGES:])

    trace: list[tuple[str, dict[str, Any]]] = []
    tools: list[dict[str, Any]] | None = TOOL_DEFINITIONS
    turn = None
    for round_index in range(MAX_TOOL_ROUNDS + 1):
        if round_index == MAX_TOOL_ROUNDS:
            tools = None
        turn = complete_chat(history, tools)
        if turn.tool_calls and tools:
            history.append(_assistant_record(turn))
            for call in turn.tool_calls:
                result = execute_tool(call.name, call.arguments, db=db, redis=redis, context=context or {})
                trace.append((call.name, result))
                history.append(
                    {
                        "role": "tool",
                        "tool_call_id": call.id,
                        "name": call.name,
                        "content": json.dumps(result, default=str)[:8000],
                    }
                )
            continue
        break

    reply = _plain_reply(
        (turn.content if turn else None)
        or "I looked that up in BusFlow, but I do not have a clear answer yet. Try a stop, a bus number, or a destination."
    )
    return {"reply": reply, "cards": cards_from_tools(trace)}
