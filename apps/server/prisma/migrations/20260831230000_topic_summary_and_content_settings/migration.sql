-- A one-line summary for the topics list, and per-topic standing instructions
-- for everything the model writes inside that topic.
--
-- Both are NOT NULL with a default, because migrations run from the GitHub
-- runner before the new bundle ships: for the seconds in between, the old code
-- is still inserting topics that name neither column. '' is a valid value for
-- both — unlike topics.slug, where empty would fail the schema on the next read
-- — so the default is the real one rather than a placeholder to drop later.
ALTER TABLE "topics" ADD COLUMN "summary" TEXT NOT NULL DEFAULT '';
ALTER TABLE "topics" ADD COLUMN "content_instructions" TEXT NOT NULL DEFAULT '';

-- ContentStyle, as TEXT: the enum lives in packages/schemas and the column is a
-- plain string, so adding a style later is a code change with no migration.
ALTER TABLE "topics" ADD COLUMN "style" TEXT NOT NULL DEFAULT 'short_and_crisp';

-- Minutes per node, and the length a card is written to. 3 is the middle of the
-- 1-5 band the map was already generated in, so nothing about an existing topic
-- changes until the learner moves it.
ALTER TABLE "topics" ADD COLUMN "average_read_time" INTEGER NOT NULL DEFAULT 3;

-- Seed the summary from the first line of the goal, which is what the topics
-- list was already showing. An existing topic therefore keeps saying the same
-- thing about itself on the day this ships, and the learner edits it from there
-- rather than finding every topic suddenly blank.
UPDATE "topics"
SET "summary" = left(split_part(btrim("goal"), E'\n', 1), 160)
WHERE btrim("goal") <> '';
