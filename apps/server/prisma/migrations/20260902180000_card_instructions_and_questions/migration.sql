-- What a learner asks for one card in particular, and the questions they ask
-- on it.
--
-- Both new columns are NOT NULL with a default of '', because migrations run
-- from the GitHub runner before the new bundle ships: for the seconds in
-- between, the old code is still inserting nodes and cards that name neither.
-- '' is also the right value for every existing row — nothing had been asked.
--
-- card_questions is a new table, so nothing existing changes shape for it.
-- Rows go with their node.

-- AlterTable
ALTER TABLE "learning_nodes" ADD COLUMN "card_instructions" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "concept_cards" ADD COLUMN "instructions" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "card_questions" (
    "id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- Read in order on every card open, and counted by the hour for the budget.
CREATE INDEX "card_questions_node_id_created_at_idx" ON "card_questions"("node_id", "created_at");

-- AddForeignKey
ALTER TABLE "card_questions" ADD CONSTRAINT "card_questions_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "learning_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
