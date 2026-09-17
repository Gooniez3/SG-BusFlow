# SG BusFlow

Real-time Singapore public transport: nearby stops, live arrivals, route exploration, and journey planning.

This repository is a monorepo for the web app, mobile app, and API. **This commit is the skeleton only** — no applications or services are implemented yet.

Product scope is frozen in [docs/PRODUCT.md](docs/PRODUCT.md). Development order is in [docs/ROADMAP.md](docs/ROADMAP.md).

## Architecture

```
        LTA DataMall
             │
             ▼
     Python ingestion
             │
             ▼
           Redis
             │
             ▼
   PostgreSQL + PostGIS
             │
          FastAPI
             │
    ┌────────┴────────┐
    ▼                 ▼
 Next.js         React Native
  (web)           (mobile)
```

| Layer | Stack |
|-------|--------|
| Web | Next.js (`apps/web`) |
| Mobile | React Native + Expo (`apps/mobile`) |
| API | Python FastAPI (`backend/api`) |
| Data | LTA DataMall → Redis → PostgreSQL + PostGIS |

## Layout

```
apps/web              Next.js client (not scaffolded yet)
apps/mobile           React Native + Expo (not scaffolded yet)
backend/api           FastAPI (not scaffolded yet)
packages/types        Shared types
packages/config       Shared config
infrastructure/docker
infrastructure/terraform
docs                  Product spec and roadmap
```

## Local development

`docker compose up` will eventually start `web`, `mobile`, `api`, `postgres`, and `redis`. Services are not defined yet.
