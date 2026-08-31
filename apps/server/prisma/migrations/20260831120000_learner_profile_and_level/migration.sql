-- The learner profile, and the calibration answer the topic form now asks for.
--
-- Every column here is added with a default or nullable, because migrations run
-- from the GitHub runner before the new bundle ships: for the seconds in between,
-- the old code is still inserting rows without them.

-- The profile. Age is nullable because "not said" is a real answer, and the
-- other two default to empty for the same reason — nothing here is required.
ALTER TABLE "users" ADD COLUMN "age" INTEGER;
ALTER TABLE "users" ADD COLUMN "background" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "learning_styles" TEXT[];

-- "What related things do you already use?" became "where are you now, and where
-- do you want to get to?", which is a sentence rather than a list of domains.
ALTER TABLE "topics" ADD COLUMN "level" TEXT NOT NULL DEFAULT '';

-- Carry the old answer across rather than losing it: an existing topic keeps the
-- calibration it was generated from, so a retry produces the same kind of map.
UPDATE "topics"
SET "level" = 'Already uses: ' || array_to_string("known_domains", ', ')
WHERE "known_domains" IS NOT NULL AND array_length("known_domains", 1) > 0;

-- "known_domains" is deliberately NOT dropped here. Dropping it in the same push
-- would break the old version mid-deploy, which still selects it on every topic
-- read. It is unused from this release on; the next schema change drops it.
