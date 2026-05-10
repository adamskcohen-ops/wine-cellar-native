# Railway deployment

The backend lives in `/backend` inside the `adamskcohen-ops/wine-cellar-native` monorepo.

Railway should deploy only this folder, not the Expo app at the repo root.

## Config included in this repo

`backend/railway.json` tells Railway to use Railpack, run `npm run build`, start with `npm run start:prod`, and health-check `/health`.

`npm run start:prod` runs `prisma migrate deploy` before starting the API, so checked-in migrations are applied on deploy.

## Required Railway service settings

Create a Railway project and service from GitHub repo `adamskcohen-ops/wine-cellar-native`.

Set the service root directory to:

```txt
/backend
```

Railway docs note that config files are resolved from the repo root, so if the UI asks for a config file path, use:

```txt
/backend/railway.json
```

Add a Railway Postgres database to the project. Railway will inject `DATABASE_URL` into the backend service when the database is connected.

## Required variables

Set these on the backend service:

```txt
NODE_ENV=production
JWT_ACCESS_SECRET=<strong random string, 32+ chars>
JWT_REFRESH_SECRET=<different strong random string, 32+ chars>
CORS_ORIGIN=<comma-separated allowed origins>
```

Optional:

```txt
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=30
WINE_SEARCHER_API_KEY=<server-side Wine-Searcher key>
WINE_SEARCHER_BASE_URL=https://api.wine-searcher.com
```

Generate JWT secrets locally with:

```sh
openssl rand -base64 48
openssl rand -base64 48
```

For early mobile TestFlight testing, `CORS_ORIGIN` can stay permissive only if needed, but lock it down before public launch.

## CLI flow

Install and authenticate:

```sh
npm i -g @railway/cli
railway login
```

From the repo root:

```sh
railway init
railway link
railway up --service <backend-service-name> --detach
```

If using the Railway dashboard instead, connect the GitHub repo, set root directory `/backend`, add Postgres, set variables, then deploy.

## Smoke test

After deploy, open:

```txt
https://<railway-domain>/health
```

Expected response:

```json
{ "ok": true, "service": "wine-cellar-api" }
```

## Local production check

From `/backend`:

```sh
npm install
npm run build
npm run typecheck
npm audit
```
