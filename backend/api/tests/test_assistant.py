from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.assistant.llm import LLMTurn, ToolCall
from app.main import app


def test_assistant_requires_api_key(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.api.v1.assistant.get_settings",
        lambda: SimpleNamespace(openai_api_key=""),
    )
    client = TestClient(app)
    response = client.post(
        "/api/v1/assistant/chat",
        json={"messages": [{"role": "user", "content": "When is the next 230?"}]},
    )
    assert response.status_code == 503
    assert "API_KEY" in response.json()["detail"]
    status = client.get("/api/v1/assistant/status")
    assert status.status_code == 200
    assert status.json()["ready"] is False


def test_assistant_explains_tool_results(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.api.v1.assistant.get_settings",
        lambda: SimpleNamespace(openai_api_key="test-key"),
    )
    turns = [
        LLMTurn(
            content=None,
            tool_calls=[ToolCall(id="call_1", name="search_stops", arguments={"q": "Changi"})],
        ),
        LLMTurn(
            content="**Changi Airport T3** is served by several buses. Open a stop card for live times.",
            tool_calls=[],
        ),
    ]

    def fake_complete(_messages, _tools):
        return turns.pop(0)

    monkeypatch.setattr("app.assistant.chat.complete_chat", fake_complete)
    monkeypatch.setattr(
        "app.assistant.chat.execute_tool",
        lambda name, arguments, db=None, redis=None, context=None: {
            "query": "Changi",
            "stops": [{"code": "95129", "name": "Changi Airport PTB3", "road_name": "Airport Blvd", "lat": 1.35, "lng": 103.98}],
        },
    )
    monkeypatch.setattr("app.api.v1.assistant.SessionLocal", lambda: SimpleNamespace(close=lambda: None))
    monkeypatch.setattr("app.api.v1.assistant.get_redis", lambda: SimpleNamespace())

    client = TestClient(app)
    response = client.post(
        "/api/v1/assistant/chat",
        json={"messages": [{"role": "user", "content": "How do I get to Changi Airport?"}]},
    )
    assert response.status_code == 200
    body = response.json()
    assert "Changi Airport T3 is served by several buses." in body["reply"]
    assert "**" not in body["reply"]
    assert body["cards"]
    assert body["cards"][0]["kind"] == "stop"
    assert body["cards"][0]["href"] == "/stops/95129"


def test_retired_gemini_models_remap_to_current_flash() -> None:
    from app.core.config import Settings

    settings = Settings(openai_model="gemini-2.5-flash", gemini_api_key="g", groq_api_key="")
    assert settings.llm_provider() == "gemini"
    assert settings.llm_model() == "gemini-3.6-flash"


def test_groq_key_wins_over_gemini() -> None:
    from app.core.config import Settings

    settings = Settings(
        groq_api_key="gsk_test",
        gemini_api_key="gemini-test",
        openai_model="gemini-3.6-flash",
    )
    assert settings.llm_provider() == "groq"
    assert settings.llm_api_key() == "gsk_test"
    assert settings.llm_model() == "openai/gpt-oss-120b"
    assert settings.llm_base_url() == "https://api.groq.com/openai/v1"


def test_plain_reply_strips_markdown_and_lists() -> None:
    from app.assistant.chat import _plain_reply

    dump = """Here are the bus stops nearest to your current location:

1. **Blk 27** (Stop Code: `52331`)
   ***Road:*** Lor 6 Toa Payoh
   ***Distance:*** ~61m

### Route Overview
**Walk 1 min**
"""
    reply = _plain_reply(dump)
    assert "Blk 27" not in reply
    assert "**" not in reply
    assert "`" not in reply
    assert "nearest" in reply.lower()
    assert len(reply) <= 220


def test_cards_prefer_journeys_and_skip_empty_arrivals() -> None:
    from app.assistant.tools import cards_from_tools

    cards = cards_from_tools(
        [
            (
                "search_stops",
                {
                    "nearby": False,
                    "stops": [
                        {"code": "95129", "name": "Changi Airport Ter 2", "distance_m": 15047},
                    ],
                },
            ),
            (
                "get_stop_arrivals",
                {"stop_code": "52331", "stop_name": "Blk 27", "services": []},
            ),
            (
                "plan_journey",
                {
                    "options": [
                        {
                            "id": "opt-1",
                            "duration_min": 72,
                            "transfers": 2,
                            "summary": "Walk 1 min → Bus 57 → Bus 28",
                            "live_minutes": 4,
                        }
                    ],
                    "hrefs": ["/journey/detail?option=opt-1"],
                },
            ),
        ]
    )
    assert len(cards) == 1
    assert cards[0]["kind"] == "journey"
    assert cards[0]["duration_min"] == 72


def test_nearby_stop_cards_drop_far_results() -> None:
    from app.assistant.tools import cards_from_tools

    cards = cards_from_tools(
        [
            (
                "search_stops",
                {
                    "nearby": True,
                    "stops": [
                        {"code": "52331", "name": "Blk 27", "distance_m": 61},
                        {"code": "95129", "name": "Changi Airport Ter 2", "distance_m": 15047},
                    ],
                },
            )
        ]
    )
    assert [card["title"] for card in cards] == ["Blk 27"]
    assert cards[0]["subtitle"] == "52331 · 61 m"
