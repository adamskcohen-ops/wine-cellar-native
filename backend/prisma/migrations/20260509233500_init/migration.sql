-- CreateEnum
CREATE TYPE "WineStatus" AS ENUM ('cellar', 'consumed', 'wishlist');

-- CreateEnum
CREATE TYPE "SyncOperation" AS ENUM ('upsert', 'delete');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('free', 'premium', 'collector');

-- CreateEnum
CREATE TYPE "CellarRole" AS ENUM ('owner', 'admin', 'editor', 'viewer');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('pending', 'accepted', 'revoked', 'expired');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('ordered', 'shipped', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('drink_window', 'valuation_change', 'delivery_update');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'free',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replaced_by" UUID,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cellars" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "cellars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cellar_members" (
    "id" UUID NOT NULL,
    "cellar_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "CellarRole" NOT NULL DEFAULT 'viewer',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cellar_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cellar_invites" (
    "id" UUID NOT NULL,
    "cellar_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "CellarRole" NOT NULL DEFAULT 'viewer',
    "token_hash" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'pending',
    "invited_by_user_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cellar_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_locations" (
    "id" UUID NOT NULL,
    "cellar_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storage_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wines" (
    "id" UUID NOT NULL,
    "normalized_key" TEXT NOT NULL,
    "producer" TEXT,
    "name" TEXT NOT NULL,
    "vintage" INTEGER,
    "type" TEXT,
    "varietal" TEXT,
    "country" TEXT,
    "region" TEXT,
    "sub_region" TEXT,
    "appellation" TEXT,
    "designation" TEXT,
    "critic_score" DOUBLE PRECISION,
    "market_value_min" DECIMAL(10,2),
    "market_value_avg" DECIMAL(10,2),
    "market_value_max" DECIMAL(10,2),
    "drink_start" INTEGER,
    "drink_end" INTEGER,
    "tasting_notes" TEXT,
    "food_pairings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "raw_source" JSONB,
    "source" TEXT DEFAULT 'wine-searcher',
    "last_valuation_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cellar_bottles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "cellar_id" UUID,
    "wine_id" UUID,
    "location_id" UUID,
    "client_id" TEXT,
    "status" "WineStatus" NOT NULL DEFAULT 'cellar',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "bottle_size" TEXT DEFAULT '750ml',
    "price_paid" DECIMAL(10,2),
    "market_value" DECIMAL(10,2),
    "purchase_date" TIMESTAMP(3),
    "purchase_source" TEXT,
    "storage_location" TEXT,
    "rack" TEXT,
    "bin" TEXT,
    "personal_rating" INTEGER,
    "personal_notes" TEXT,
    "date_consumed" TIMESTAMP(3),
    "image_uri" TEXT,
    "local_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "cellar_bottles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlists" (
    "id" UUID NOT NULL,
    "cellar_id" UUID,
    "owner_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_shared" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wishlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist_items" (
    "id" UUID NOT NULL,
    "wishlist_id" UUID NOT NULL,
    "wine_id" UUID,
    "notes" TEXT,
    "target_price" DECIMAL(10,2),
    "priority" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" UUID NOT NULL,
    "cellar_id" UUID NOT NULL,
    "location_id" UUID,
    "merchant" TEXT,
    "order_number" TEXT,
    "tracking_number" TEXT,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'ordered',
    "expected_date" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_items" (
    "id" UUID NOT NULL,
    "delivery_id" UUID NOT NULL,
    "wine_id" UUID,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price_paid" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "valuation_snapshots" (
    "id" UUID NOT NULL,
    "wine_id" UUID NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'wine-searcher',
    "value_min" DECIMAL(10,2),
    "value_avg" DECIMAL(10,2),
    "value_max" DECIMAL(10,2),
    "raw_source" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "valuation_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wine_lookup_cache" (
    "id" UUID NOT NULL,
    "query_hash" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "wine_id" UUID,
    "response" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wine_lookup_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "scheduled_for" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "operation" "SyncOperation" NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "cellars_owner_id_idx" ON "cellars"("owner_id");

-- CreateIndex
CREATE INDEX "cellar_members_user_id_idx" ON "cellar_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "cellar_members_cellar_id_user_id_key" ON "cellar_members"("cellar_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "cellar_invites_token_hash_key" ON "cellar_invites"("token_hash");

-- CreateIndex
CREATE INDEX "cellar_invites_cellar_id_idx" ON "cellar_invites"("cellar_id");

-- CreateIndex
CREATE INDEX "cellar_invites_email_idx" ON "cellar_invites"("email");

-- CreateIndex
CREATE INDEX "storage_locations_cellar_id_idx" ON "storage_locations"("cellar_id");

-- CreateIndex
CREATE UNIQUE INDEX "wines_normalized_key_key" ON "wines"("normalized_key");

-- CreateIndex
CREATE INDEX "wines_name_idx" ON "wines"("name");

-- CreateIndex
CREATE INDEX "wines_producer_idx" ON "wines"("producer");

-- CreateIndex
CREATE INDEX "wines_country_region_idx" ON "wines"("country", "region");

-- CreateIndex
CREATE INDEX "cellar_bottles_cellar_id_status_idx" ON "cellar_bottles"("cellar_id", "status");

-- CreateIndex
CREATE INDEX "cellar_bottles_user_id_status_idx" ON "cellar_bottles"("user_id", "status");

-- CreateIndex
CREATE INDEX "cellar_bottles_updated_at_idx" ON "cellar_bottles"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "cellar_bottles_user_id_client_id_key" ON "cellar_bottles"("user_id", "client_id");

-- CreateIndex
CREATE INDEX "wishlists_owner_id_idx" ON "wishlists"("owner_id");

-- CreateIndex
CREATE INDEX "wishlists_cellar_id_idx" ON "wishlists"("cellar_id");

-- CreateIndex
CREATE INDEX "wishlist_items_wishlist_id_idx" ON "wishlist_items"("wishlist_id");

-- CreateIndex
CREATE INDEX "deliveries_cellar_id_status_idx" ON "deliveries"("cellar_id", "status");

-- CreateIndex
CREATE INDEX "delivery_items_delivery_id_idx" ON "delivery_items"("delivery_id");

-- CreateIndex
CREATE INDEX "valuation_snapshots_wine_id_created_at_idx" ON "valuation_snapshots"("wine_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "wine_lookup_cache_query_hash_key" ON "wine_lookup_cache"("query_hash");

-- CreateIndex
CREATE INDEX "wine_lookup_cache_expires_at_idx" ON "wine_lookup_cache"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX "device_tokens_user_id_idx" ON "device_tokens"("user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "notifications_scheduled_for_idx" ON "notifications"("scheduled_for");

-- CreateIndex
CREATE INDEX "sync_events_user_id_created_at_idx" ON "sync_events"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cellars" ADD CONSTRAINT "cellars_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cellar_members" ADD CONSTRAINT "cellar_members_cellar_id_fkey" FOREIGN KEY ("cellar_id") REFERENCES "cellars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cellar_members" ADD CONSTRAINT "cellar_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cellar_invites" ADD CONSTRAINT "cellar_invites_cellar_id_fkey" FOREIGN KEY ("cellar_id") REFERENCES "cellars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cellar_invites" ADD CONSTRAINT "cellar_invites_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_locations" ADD CONSTRAINT "storage_locations_cellar_id_fkey" FOREIGN KEY ("cellar_id") REFERENCES "cellars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cellar_bottles" ADD CONSTRAINT "cellar_bottles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cellar_bottles" ADD CONSTRAINT "cellar_bottles_cellar_id_fkey" FOREIGN KEY ("cellar_id") REFERENCES "cellars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cellar_bottles" ADD CONSTRAINT "cellar_bottles_wine_id_fkey" FOREIGN KEY ("wine_id") REFERENCES "wines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cellar_bottles" ADD CONSTRAINT "cellar_bottles_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "storage_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_cellar_id_fkey" FOREIGN KEY ("cellar_id") REFERENCES "cellars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_wishlist_id_fkey" FOREIGN KEY ("wishlist_id") REFERENCES "wishlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_wine_id_fkey" FOREIGN KEY ("wine_id") REFERENCES "wines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_cellar_id_fkey" FOREIGN KEY ("cellar_id") REFERENCES "cellars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "storage_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_items" ADD CONSTRAINT "delivery_items_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_items" ADD CONSTRAINT "delivery_items_wine_id_fkey" FOREIGN KEY ("wine_id") REFERENCES "wines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valuation_snapshots" ADD CONSTRAINT "valuation_snapshots_wine_id_fkey" FOREIGN KEY ("wine_id") REFERENCES "wines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wine_lookup_cache" ADD CONSTRAINT "wine_lookup_cache_wine_id_fkey" FOREIGN KEY ("wine_id") REFERENCES "wines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_events" ADD CONSTRAINT "sync_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

