-- Sessions had no expiry, so a leaked bearer token stayed valid forever and the
-- table grew by a row per login with nothing ever removing them.
--
-- Added in three steps rather than as one NOT NULL column: an existing row has
-- no value to put there, and a bare `ADD COLUMN ... NOT NULL` would fail on any
-- database that already has sessions in it.

-- 1. Add it nullable.
ALTER TABLE "auth_sessions" ADD COLUMN "expires_at" TIMESTAMP(3);

-- 2. Backfill. Existing sessions get the same 30 days from when they were made,
--    so anyone signed in today is not signed out by this migration.
UPDATE "auth_sessions" SET "expires_at" = "created_at" + INTERVAL '30 days'
WHERE "expires_at" IS NULL;

-- 3. Now it can be required.
ALTER TABLE "auth_sessions" ALTER COLUMN "expires_at" SET NOT NULL;

-- Supports both the expiry check on every authenticated request and the
-- opportunistic cleanup of lapsed rows at login.
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");
