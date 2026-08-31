-- Multi-level maps, and slugs for every URL in the product.
--
-- Three things happen here: topics and nodes gain the slug/path columns the
-- router now navigates by, learning_nodes gains the parent edge that makes the
-- map a tree, and every existing row is given a slug derived from its title so
-- old content keeps working under the new URLs.
--
-- Migrations run from the GitHub runner before the new bundle ships, so for a
-- few seconds the OLD code is still inserting rows that name none of these
-- columns. Both new NOT NULL columns therefore carry a default, and the default
-- is a random hex string rather than '' — an empty slug would fail the Slug
-- schema on the next read, and two of them would collide on the unique index.
-- The defaults exist only for that window; drop them in the next schema change.

-- 1. Columns ---------------------------------------------------------------

ALTER TABLE "topics" ADD COLUMN "slug" TEXT NOT NULL DEFAULT md5(random()::text);
-- MapLevels.Two. Every map built before this migration was flat, and is read as
-- a two-level map with one level missing rather than being rebuilt behind the
-- learner's back — regenerating is an edit they choose, not a side effect.
ALTER TABLE "topics" ADD COLUMN "levels" INTEGER NOT NULL DEFAULT 2;

ALTER TABLE "learning_nodes" ADD COLUMN "parent_id" TEXT;
ALTER TABLE "learning_nodes" ADD COLUMN "path" TEXT NOT NULL DEFAULT md5(random()::text);

-- 2. Slugs for existing content --------------------------------------------

-- The same rule as slugify() in packages/schemas: lower case, every run of
-- anything else becomes one hyphen, cut to 60, hyphens trimmed from the ends.
-- A title that leaves nothing behind (an emoji, CJK) falls back to "item",
-- which the numbering below then makes unique.
CREATE FUNCTION pg_temp.slugify(source TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(
    NULLIF(trim(both '-' from left(regexp_replace(lower(source), '[^a-z0-9]+', '-', 'g'), 60)), ''),
    'item');
$$;

-- The nth slug of a given shape: the first keeps the base, the rest are
-- suffixed. The stem is cut to 55 first so a long title plus a suffix still
-- fits the 60 the Slug schema allows.
CREATE FUNCTION pg_temp.numbered(base TEXT, n INTEGER) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN n <= 1 THEN base
    ELSE COALESCE(NULLIF(trim(both '-' from left(base, 55)), ''), 'item') || '-' || n
  END;
$$;

-- Segments the router owns. Starting these at 2 rather than 1 is how a topic
-- called "New" is kept off /topic/new, which is the create screen.
CREATE FUNCTION pg_temp.first_rank(base TEXT) RETURNS INTEGER
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN base IN ('new', 'edit', 'drill', 'api', 'topic', 'node') THEN 1 ELSE 0 END;
$$;

-- Oldest topic keeps the clean slug; later ones with the same title are
-- numbered. Ordering by created_at makes the result the same on every replay.
WITH ranked AS (
  SELECT
    t.id,
    b.base,
    row_number() OVER (PARTITION BY t.user_id, b.base ORDER BY t.created_at, t.id)
      + pg_temp.first_rank(b.base) AS rank
  FROM "topics" t
  CROSS JOIN LATERAL (SELECT pg_temp.slugify(t.title) AS base) b
)
UPDATE "topics"
SET "slug" = pg_temp.numbered(ranked.base, ranked.rank::INTEGER)
FROM ranked
WHERE "topics"."id" = ranked.id;

-- Every map that exists today is flat, so each node is top level and its path
-- is just its own slug. parent_id stays NULL for all of them.
WITH ranked AS (
  SELECT
    n.id,
    b.base,
    row_number() OVER (PARTITION BY n.topic_id, b.base ORDER BY n.order_index, n.id)
      + pg_temp.first_rank(b.base) AS rank
  FROM "learning_nodes" n
  CROSS JOIN LATERAL (SELECT pg_temp.slugify(n.title) AS base) b
)
UPDATE "learning_nodes"
SET "path" = pg_temp.numbered(ranked.base, ranked.rank::INTEGER)
FROM ranked
WHERE "learning_nodes"."id" = ranked.id;

-- 3. Constraints ------------------------------------------------------------

CREATE UNIQUE INDEX "topics_user_id_slug_key" ON "topics"("user_id", "slug");

-- Unique on the path rather than on (parent_id, slug): Postgres never treats
-- two NULLs as equal, so a constraint naming parent_id would exempt every
-- top-level node from itself. Siblings share a parent path, so this says the
-- same thing and can actually be enforced.
CREATE UNIQUE INDEX "learning_nodes_topic_id_path_key" ON "learning_nodes"("topic_id", "path");
CREATE INDEX "learning_nodes_parent_id_idx" ON "learning_nodes"("parent_id");

ALTER TABLE "learning_nodes"
  ADD CONSTRAINT "learning_nodes_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "learning_nodes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. The column the last migration left behind ------------------------------

-- "known_domains" was superseded by "level" one release ago and kept so the
-- then-running code could still select it. Nothing reads it now.
ALTER TABLE "topics" DROP COLUMN "known_domains";
