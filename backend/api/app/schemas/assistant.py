from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class AssistantMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class AssistantJourneyContext(BaseModel):
    from_label: str | None = None
    to_label: str | None = None
    from_lat: float | None = None
    from_lng: float | None = None
    to_lat: float | None = None
    to_lng: float | None = None
    from_stop: str | None = None
    to_stop: str | None = None
    duration_min: int | None = None
    summary: str | None = None


class AssistantContext(BaseModel):
    stop_code: str | None = None
    stop_name: str | None = None
    service_no: str | None = None
    lat: float | None = None
    lng: float | None = None
    journey: AssistantJourneyContext | None = None


class AssistantChatRequest(BaseModel):
    messages: list[AssistantMessage] = Field(min_length=1)
    context: AssistantContext | None = None


class AssistantCard(BaseModel):
    kind: str
    title: str
    subtitle: str | None = None
    href: str | None = None
    service_no: str | None = None
    stop_code: str | None = None
    duration_min: int | None = None
    transfers: int | None = None
    live_minutes: int | None = None


class AssistantChatResponse(BaseModel):
    reply: str
    cards: list[AssistantCard] = Field(default_factory=list)


class AssistantStatusResponse(BaseModel):
    ready: bool
    detail: str | None = None
