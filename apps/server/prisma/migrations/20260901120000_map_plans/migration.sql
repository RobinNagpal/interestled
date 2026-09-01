-- The seven questions asked between the create form and the map, and the
-- answers given to them.
--
-- A new table only: nothing existing gains a column and nothing existing gains a
-- NOT NULL, so the code running for the seconds between this migration and the
-- new bundle shipping carries on inserting topics and nodes exactly as it does
-- today. A topic with no plan behind it is the normal state for every topic
-- built before this ships, and the map prompt simply says nothing about choices.
--
-- topic_id is nullable because a plan is generated before the topic exists: the
-- learner answers seven questions about a topic that is only created when they
-- press the last button. It is filled in when the map is built from the plan,
-- and the row goes with the topic when the topic is deleted.

-- CreateTable
CREATE TABLE "map_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "topic_id" TEXT,
    "questions" JSONB NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "map_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- Rows in the last hour are the budget counter for the questions call, which is
-- a model call reachable before any topic or node exists.
CREATE INDEX "map_plans_user_id_created_at_idx" ON "map_plans"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "map_plans_topic_id_idx" ON "map_plans"("topic_id");

-- AddForeignKey
ALTER TABLE "map_plans" ADD CONSTRAINT "map_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_plans" ADD CONSTRAINT "map_plans_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
