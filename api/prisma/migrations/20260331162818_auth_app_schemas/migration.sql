-- Move existing public tables into `app` schema, add `auth` tables, drop legacy OAuthAccount.

CREATE SCHEMA IF NOT EXISTS "app";
CREATE SCHEMA IF NOT EXISTS "auth";

-- Legacy OAuth table (replaced by auth.oauth_identities)
DROP TABLE IF EXISTS "public"."OAuthAccount";

-- Relocate app domain tables from public → app (preserves data & FKs)
ALTER TABLE IF EXISTS "public"."User" SET SCHEMA "app";
ALTER TABLE IF EXISTS "public"."Circle" SET SCHEMA "app";
ALTER TABLE IF EXISTS "public"."CircleMember" SET SCHEMA "app";
ALTER TABLE IF EXISTS "public"."Plan" SET SCHEMA "app";
ALTER TABLE IF EXISTS "public"."Concern" SET SCHEMA "app";
ALTER TABLE IF EXISTS "public"."Task" SET SCHEMA "app";

-- Enums
CREATE TYPE "auth"."OAuthProvider" AS ENUM ('google', 'apple', 'github');
CREATE TYPE "app"."DevicePlatform" AS ENUM ('ios', 'android');

-- Auth: OAuth identities (no Google tokens stored)
CREATE TABLE "auth"."oauth_identities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "auth"."OAuthProvider" NOT NULL,
    "provider_id" TEXT NOT NULL,
    "email" TEXT,
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_identities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "oauth_identities_provider_provider_id_key" ON "auth"."oauth_identities"("provider", "provider_id");

ALTER TABLE "auth"."oauth_identities" ADD CONSTRAINT "oauth_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Auth: refresh token sessions
CREATE TABLE "auth"."refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "device_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "refresh_tokens_user_id_idx" ON "auth"."refresh_tokens"("user_id");

ALTER TABLE "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- App: push notification device tokens
CREATE TABLE "app"."device_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" "app"."DevicePlatform" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "device_tokens_user_id_token_key" ON "app"."device_tokens"("user_id", "token");

ALTER TABLE "app"."device_tokens" ADD CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
