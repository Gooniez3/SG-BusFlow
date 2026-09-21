from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.assistant.chat import run_chat
from app.assistant.llm import MISSING_KEY, LLMError, _api_key
from app.core.config import get_settings
from app.core.db import SessionLocal
from app.core.redis import get_redis
from app.schemas.assistant import AssistantChatRequest, AssistantChatResponse, AssistantStatusResponse

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.get("/status", response_model=AssistantStatusResponse)
def assistant_status() -> AssistantStatusResponse:
    ready = bool(_api_key(get_settings()))
    return AssistantStatusResponse(ready=ready, detail=None if ready else MISSING_KEY)


@router.post("/chat", response_model=AssistantChatResponse)
def assistant_chat(body: AssistantChatRequest) -> AssistantChatResponse:
    if not _api_key(get_settings()):
        raise HTTPException(status_code=503, detail=MISSING_KEY)
    db = SessionLocal()
    redis = get_redis()
    try:
        payload = run_chat(
            db,
            redis,
            messages=[item.model_dump() for item in body.messages],
            context=body.context.model_dump() if body.context else None,
        )
    except LLMError as exc:
        raise HTTPException(status_code=503, detail=exc.detail) from exc
    finally:
        db.close()
    return AssistantChatResponse.model_validate(payload)
