# SG BusFlow

Real-time Singapore bus tracking: nearby stops, live arrivals, journeys, and on-device arrival alerts.

Web and Expo talk to one FastAPI service. Arrivals and routes come from LTA DataMall through Redis and PostgreSQL/PostGIS. The AI assistant only explains those results.

## Architecture

```
                 LTA DataMall
                       │
                       ▼
                 ┌──────────┐
                 │  Worker  │
                 └────┬─────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
   PostgreSQL + PostGIS         Redis
          ▲                       ▲
          └───────────┬───────────┘
                      │
                 ┌──────────┐
                 │ FastAPI  │
                 └────┬─────┘
          ┌───────────┴───────────┐
          ▼                       ▼
       Next.js                  Expo
       (host)                  (host)
```

| Layer | Where it runs |
|-------|----------------|
| API + worker | Docker Compose |
| PostgreSQL/PostGIS + Redis | Docker Compose |
| Web | `apps/web` on the host |
| Mobile | `apps/mobile` on the host |

## Backend with Docker

From a clean checkout:

```powershell
copy .env.example .env
docker compose up --build
docker compose run --rm api alembic upgrade head
```

Migrations are a separate command. Starting the API does not change the database.

Then:

- http://localhost:8000/health
- http://localhost:8000/health/ready

Set `LTA_ACCOUNT_KEY` in `.env` before expecting the worker to ingest stops and arrivals. Without that key the worker stays running and idle. If `backend/api/.env` also exists, its values override the root file. Inside the containers, Compose still forces `DATABASE_URL` and `REDIS_URL` onto the Postgres and Redis services. `.env` stays out of Git.

`postgres_data` is a named volume, so `docker compose down` keeps the database. `docker compose down -v` deletes it. Redis has no volume; a restart comes back empty, and the API keeps serving with Phase 14 fail-soft behaviour.

Useful commands:

```powershell
docker compose build
docker compose up -d
docker compose logs -f api worker
docker compose restart redis
docker compose restart worker
```

Postgres is published on **localhost:5433** and Redis on **localhost:6379**, so a host venv can still use `backend/api/.env`.

## Web and Expo

Leave these outside Docker.

```powershell
cd apps/web
npm install
npm run dev
```

```powershell
cd apps/mobile
npm install
npx expo start --lan
```

Point the clients at `http://localhost:8000` (web) or your LAN IP on port 8000 (Expo).

## Tests

```powershell
cd backend/api
.\.venv\Scripts\python.exe -m pytest -q
```

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and on pull requests. It does not call LTA DataMall and does not need API keys.

- **Backend:** PostGIS and Redis service containers, then `alembic upgrade head`, then `pytest`.
- **Web:** `npm ci`, `npm run lint`, `npm run build`.
- **Expo:** `npm ci` and `npx tsc --noEmit`. Store builds stay out of CI.
- **Docker:** `docker compose config` and `docker compose build`, using `.env.example` as a placeholder env file.
