-- Every learner gets a slug of their own, which is the top folder of every
-- audio object they own: robin/kubernetes/scheduling/taints/… is a path a
-- person can find a file down, and an account id is not.
--
-- The default is for the deploy gap only. Migrations run from the runner before
-- the new bundle ships, so for a few seconds the old code still registers users
-- naming no slug; md5(random()) rather than '' because two empty slugs collide
-- on the unique index below and take registration down with them.
ALTER TABLE "users" ADD COLUMN "slug" TEXT NOT NULL DEFAULT md5((random())::text);

-- Backfill from the address, the same rule emailSlug + uniqueSlug apply at
-- registration: the part before the @, lower-cased, punctuation collapsed to
-- single hyphens, trimmed, cut to SLUG_MAX_LENGTH, and repeats numbered from 2.
-- Ordered by id, which sorts by creation time, so the oldest account of a
-- colliding pair keeps the unnumbered slug.
WITH base AS (
  SELECT
    id,
    COALESCE(
      NULLIF(
        trim(BOTH '-' FROM left(
          regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9]+', '-', 'g'),
          60
        )),
        ''
      ),
      'learner'
    ) AS stem
  FROM "users"
),
numbered AS (
  SELECT id, stem, row_number() OVER (PARTITION BY stem ORDER BY id) AS rank FROM base
)
UPDATE "users" AS u
SET "slug" = CASE WHEN n.rank = 1 THEN n.stem ELSE left(n.stem, 55) || '-' || n.rank END
FROM numbered AS n
WHERE u."id" = n."id";

-- A numbered slug can still land on one somebody already holds literally —
-- two accounts at robin@ plus an account at robin-2@. Rare enough to be worth
-- no cleverness above and fatal enough to be worth handling: a failed migration
-- stops the deploy. The id is unique, so appending it cannot collide.
UPDATE "users" AS u
SET "slug" = left(u."slug", 60 - length(u."id") - 1) || '-' || u."id"
WHERE EXISTS (
  SELECT 1 FROM "users" AS other WHERE other."slug" = u."slug" AND other."id" <> u."id"
);

CREATE UNIQUE INDEX "users_slug_key" ON "users"("slug");

-- One card read aloud. Keyed on the card rather than the node because a
-- recording is of one writing of one card, and a node has a card per settings.
CREATE TABLE "card_narrations" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "script" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "seconds" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "voice" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_narrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "card_narrations_card_id_key" ON "card_narrations"("card_id");

-- The budget counter reads rows by the hour, which is what this index serves.
CREATE INDEX "card_narrations_created_at_idx" ON "card_narrations"("created_at");

ALTER TABLE "card_narrations" ADD CONSTRAINT "card_narrations_card_id_fkey"
    FOREIGN KEY ("card_id") REFERENCES "concept_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
