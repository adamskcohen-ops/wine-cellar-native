# Wine Cellar Backend

Backend API for Cellar, a real App Store wine cellar product for 20-500+ bottle collectors.

## Supports

User accounts, JWT auth with rotating refresh tokens, cloud sync with local-first reconciliation, shared invite-only cellars, shared wishlists, multi-location storage, pending deliveries, Wine-Searcher caching, valuation snapshots, push notification records, and collector/insurance exports.

## Local setup

```bash
cp .env.example .env
docker compose up -d
npm install
npx prisma migrate dev --name init
npm run dev
```

The API runs on `http://localhost:4000` by default.

## Scripts

```bash
npm run dev
npm run build
npm run prisma:generate
npm run prisma:migrate
npm run typecheck
```

## Main endpoints

`POST /auth/signup`

`POST /auth/login`

`POST /auth/refresh`

`POST /auth/logout`

`GET /cellars`

`POST /cellars`

`POST /cellars/:id/locations`

`POST /cellars/:id/invites`

`GET /cellar?cellarId=...`

`POST /cellar`

`PATCH /cellar/:id`

`DELETE /cellar/:id`

`GET /sync/snapshot`

`GET /sync/changes?since=2026-05-09T00:00:00.000Z`

`POST /sync/push`

`GET /wines/enrich?q=2019%20Burgundy`

`GET /deliveries`

`POST /deliveries`

`POST /notifications/device-tokens`

`GET /reports/insurance-export`

See `docs/ARCHITECTURE.md` for the schema and product rationale.
