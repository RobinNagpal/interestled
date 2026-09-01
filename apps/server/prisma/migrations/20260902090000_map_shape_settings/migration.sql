-- How the map is shaped and sized, and the instruction lines it is built from.
--
-- Every column is NOT NULL with a default, because migrations run from the
-- GitHub runner before the new bundle ships: for the seconds in between, the old
-- code is still inserting topics that name none of these.
--
-- time_budget and levels are NOT dropped here for the same reason — the old code
-- still writes them, and a dropped column would fail its inserts. time_budget
-- gains a default so the new code can stop writing it. Both go in the next
-- schema change, once nothing is inserting them.

-- AlterTable
ALTER TABLE "topics" ALTER COLUMN "time_budget" SET DEFAULT 'week';

-- AlterTable
-- 5 headings of 4 nodes is 20 nodes, which is the size the two-level map was
-- already producing, so an existing topic keeps saying what it always said.
ALTER TABLE "topics" ADD COLUMN "main_headings" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "topics" ADD COLUMN "sub_headings" INTEGER NOT NULL DEFAULT 4;

-- 20 minutes a day for a fortnight. The old time_budget was three words with no
-- number behind them, so there is nothing to convert from — this is the default
-- every existing topic starts at, and the learner moves it from there.
ALTER TABLE "topics" ADD COLUMN "minutes_per_day" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "topics" ADD COLUMN "days" INTEGER NOT NULL DEFAULT 14;

-- MapDepth.Working: enough to use it for the everyday cases.
ALTER TABLE "topics" ADD COLUMN "depth" INTEGER NOT NULL DEFAULT 2;

-- '' means the learner has not edited the lines, so the seed rendered from the
-- columns above applies. Every existing topic starts there.
ALTER TABLE "topics" ADD COLUMN "map_instructions" TEXT NOT NULL DEFAULT '';

-- ParagraphLength.Medium, which is 4-5 sentences.
ALTER TABLE "topics" ADD COLUMN "paragraph_length" TEXT NOT NULL DEFAULT 'medium';
