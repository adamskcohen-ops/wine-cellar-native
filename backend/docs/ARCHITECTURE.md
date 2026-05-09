# Wine Cellar Backend Architecture

This backend is designed for a real App Store product, not a personal toy. The target user is a 20-500+ bottle collector who wants a calmer, prettier private cellar system with optional cloud sync, careful privacy, and enough collector-grade structure to grow into paid tiers.

## Product direction

The product is local-first optional, cloud-capable by default. Free users can keep a small private cellar locally with scanning, notes, and export. Premium users get cloud sync, alerts, unlimited-ish cellar management, and valuation refresh. Collector users get high bottle limits, multi-location support, insurance exports, and priority enrichment.

Social starts private. The first sharing primitive is invite-only shared cellars and shared wishlists, like giving Raymond access to a household collection. Public community features are intentionally deferred to V3+ so the backend does not leak private collection, value, storage, or home-location data.

## Stack

Node.js and TypeScript power a REST API on Express 5. PostgreSQL is the system of record, accessed through Prisma. Authentication uses email/password, bcrypt password hashing, short-lived JWT access tokens, and rotating refresh tokens stored hashed in Postgres. The API can run on Railway, Render, Fly, or any long-running Node host.

## Core model

Users have a subscription tier: free, premium, or collector. Users can own cellars and can also be members of shared cellars with roles: owner, admin, editor, or viewer.

Cellars are the top-level collaboration boundary. A cellar contains bottles, storage locations, shared wishlists, deliveries, and invites. Every access check is scoped through cellar membership.

Storage locations model home cellar, wine fridge, offsite storage, or any collector-defined location. Bottle records can point to a structured location and still preserve legacy free-text rack/bin fields.

Bottles represent user or household inventory. They store user-specific data like quantity, bottle size, price paid, market value, location, rack/bin, rating, notes, consumed date, and image URI. Bottles point to normalized Wine records when enrichment is available.

Wines are normalized enrichment/cache records. They store producer, name, vintage, type, grape, origin hierarchy, market value, drinking window, tasting notes, food pairings, raw provider data, and valuation refresh timestamp.

Wishlists support private or shared purchase planning. A wishlist can belong to a user and optionally a cellar. Wishlist items point to normalized wines and include notes, target price, and priority.

Deliveries track pending orders with merchant, order number, tracking number, expected date, destination location, status, and delivery items. Delivered items can later be converted into cellar bottles.

WineLookupCache stores Wine-Searcher lookup responses by hashed query with expiry. This is intentionally aggressive because Wine-Searcher API calls are expensive. The mobile app should hit this backend, not Wine-Searcher directly.

ValuationSnapshot records historical Wine-Searcher valuation results so premium/collector users can get value changes and alerts without losing old price context.

DeviceToken and Notification support push notifications for drink windows, valuation changes, and delivery updates.

SyncEvent records server-side mutations so clients can fetch deltas after a timestamp. Full snapshot sync is also supported for first login, new device restore, and disaster recovery.

## API surface

Auth lives under `/auth`: signup, login, refresh, logout. Signup creates a default cellar, home storage location, owner membership, and shared wishlist.

Cellar management lives under `/cellars`: list accessible cellars, create cellar, create locations, create invite tokens. Invite emailing is deliberately separate so we can plug in Postmark/Resend later without blocking core API work.

Bottle CRUD lives under `/cellar`: list bottles, add bottle, update bottle, soft-delete bottle. Soft delete is required for local-first sync tombstones.

Sync lives under `/sync`: full snapshot, changes since timestamp, and push local changes. Push accepts stable client IDs so the app can create data offline and reconcile later.

Wine enrichment lives under `/wines/enrich?q=...`: checks cache first, calls Wine-Searcher only when needed, and falls back in local dev if no provider key is configured.

Deliveries live under `/deliveries`: list and create pending deliveries.

Notifications live under `/notifications`: register device tokens and list notification records. The actual push worker can be added as a separate process.

Reports live under `/reports/insurance-export`: returns collector-friendly bottle/value data for insurance and export workflows.

## Security decisions

Passwords are hashed with bcrypt cost 12. JWT access tokens are short lived. Refresh tokens are random opaque strings, stored only as SHA-256 hashes, and rotated on refresh. Helmet, CORS allowlisting, JSON body limits, and rate limiting are enabled globally. Every cellar-scoped query checks membership. API keys stay server-side only.

## Monetization hooks

The schema already stores tier. `tierLimits` centralizes the intended gates: free users at roughly 50 bottles without cloud sync, premium users with sync and valuation refresh, collector users with high limits, insurance exports, and multi-location support. Enforcement can be tightened at endpoint boundaries once pricing is final.

## Deployment notes

For local dev, run Postgres via Docker Compose, copy `.env.example` to `.env`, run Prisma migrations, then start the dev server. For production, set `DATABASE_URL`, long random JWT secrets, Wine-Searcher credentials, and strict `CORS_ORIGIN` values for the app/web clients.
