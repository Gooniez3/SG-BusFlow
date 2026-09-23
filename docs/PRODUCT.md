# SG BusFlow — Product specification

Scope for this repo. The README is the current description of what runs.

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

| Entity | Notes |
|--------|--------|
| BusStop | `id`, `code`, `name`, `latitude`, `longitude`, `location` (PostGIS geography/geometry), `road_name` |
| BusService | A numbered service (for example 174) |
| BusRoute | Direction/path of a service |
| BusRouteStop | Ordered stop on a route |
| Bus | A vehicle on a route |
| Arrival | Predicted arrival at a stop |
| FavoriteStop | On the device only. No account. |
| FavoriteService | On the device only. No account. |

Relationship:

```
BusService → BusRoute → BusRouteStop → BusStop
```

Nearby-stop queries use PostGIS on `BusStop.location`, not plain lat/lng comparisons.

## In this repo

Nearby stops, live arrivals, stop and service pages, map, WebSocket tracking, a deterministic journey planner, on-device saved stops, local arrival alerts, and an assistant that only explains API results.

Not included: accounts, MRT, and a hosted deployment. Docker Compose and GitHub Actions are how the project is run and checked.

## Non-goals

- Generating the whole product in one pass
- LLM-based route calculation
- Putting LTA API keys or other secrets in Git
- Authentication as the first feature
- Calling LTA DataMall directly from route handlers or clients

## Engineering rules

- Handle LTA unavailability without crashing: use cached data and tell the user data may be delayed.
- Keep secrets in environment variables.

See [ROADMAP.md](ROADMAP.md) for what shipped and what was left out.
