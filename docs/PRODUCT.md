# SG BusFlow — Product specification

This document freezes the initial product scope. Later tickets should follow it rather than invent new scope.

## Product

**SG BusFlow** is a real-time Singapore public transport platform. Users discover nearby bus stops, track buses, check live arrivals, explore routes, and plan journeys.

## Clients

Both clients talk to the same FastAPI backend. Clients must not duplicate backend business logic.

```
SG BusFlow
│
├── Web
│   └── Next.js
│
└── Mobile
    └── React Native + Expo
```

## Backend and data

```
LTA DataMall
      ↓
Python ingestion
      ↓
Redis
      ↓
PostgreSQL + PostGIS
```

- **API:** Python FastAPI, Pydantic, SQLAlchemy, Alembic
- **Cache:** Redis (do not hammer LTA from every user request)
- **Database:** PostgreSQL + PostGIS for spatial queries
- **Source of truth for arrivals and locations:** LTA DataMall data, never an LLM

LTA API calls live in a service layer (`backend/services/lta/`), never in route handlers.

```
FastAPI → LTA Service → LTA DataMall
```

## Core domain

Documented here; not implemented in this commit.

| Entity | Notes |
|--------|--------|
| BusStop | `id`, `code`, `name`, `latitude`, `longitude`, `location` (PostGIS geography/geometry), `road_name` |
| BusService | A numbered service (for example 174) |
| BusRoute | Direction/path of a service |
| BusRouteStop | Ordered stop on a route |
| Bus | A vehicle on a route |
| Arrival | Predicted arrival at a stop |
| User | Added with authentication (later) |
| FavoriteStop | Later |
| FavoriteService | Later |

Relationship:

```
BusService → BusRoute → BusRouteStop → BusStop
```

Nearby-stop queries use PostGIS on `BusStop.location`, not plain lat/lng comparisons.

## MVP vs later

**Build first**

- Nearby stops (`GET /api/v1/stops/nearby` with PostGIS)
- Live arrivals
- Stop and service pages
- Map
- WebSocket live tracking
- Deterministic journey planner (not LLM routing)

**Build later**

- User accounts
- Favorite stops and services
- Recent searches, home/work locations
- Notifications
- BusFlow AI (explains structured backend results only; must not invent arrival times)

**Last**

- Docker Compose local bring-up (`web`, `mobile`, `api`, `postgres`, `redis`)
- CI/CD
- AWS deployment
- Security and reliability hardening
- Portfolio polish (landing page, demo, README)

## Non-goals

- Generating the whole product in one pass
- LLM-based route calculation
- Putting LTA API keys or other secrets in Git
- Authentication as the first feature
- Calling LTA DataMall directly from route handlers or clients

## Engineering rules

- Work in small tickets: inspect existing code, explain intended changes, implement, review, test, commit.
- Introduce basic CI once the backend foundation exists; do not wait until the end.
- Handle LTA unavailability without crashing: use cached data and tell the user data may be delayed.
- Keep secrets in environment variables.

See [ROADMAP.md](ROADMAP.md) for the step-by-step sequence.
