-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "default_depth" INTEGER NOT NULL DEFAULT 2,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "goal" TEXT NOT NULL DEFAULT '',
    "archetype" TEXT NOT NULL,
    "time_budget" TEXT NOT NULL,
    "known_domains" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'generating',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_nodes" (
    "id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "claim" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "archetype" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'untouched',
    "capability" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "node_prerequisites" (
    "node_id" TEXT NOT NULL,
    "prerequisite_id" TEXT NOT NULL,

    CONSTRAINT "node_prerequisites_pkey" PRIMARY KEY ("node_id","prerequisite_id")
);

-- CreateTable
CREATE TABLE "concept_cards" (
    "id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "depth" INTEGER NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'base',
    "content" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "concept_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drills" (
    "id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "completion_test" TEXT NOT NULL,
    "reference_points" TEXT[],
    "hints" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempts" (
    "id" TEXT NOT NULL,
    "drill_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "verdict" JSONB NOT NULL,
    "hints_used" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atoms" (
    "id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "interval_days" INTEGER NOT NULL DEFAULT 0,
    "ease" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "due_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atoms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "contract" TEXT NOT NULL,
    "planned_minutes" INTEGER NOT NULL,
    "nodes_completed" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_points" (
    "user_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "drill_id" TEXT,
    "draft" TEXT NOT NULL DEFAULT '',
    "last_thought" TEXT NOT NULL DEFAULT '',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_points_pkey" PRIMARY KEY ("user_id","topic_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");

-- CreateIndex
CREATE INDEX "topics_user_id_idx" ON "topics"("user_id");

-- CreateIndex
CREATE INDEX "learning_nodes_topic_id_order_index_idx" ON "learning_nodes"("topic_id", "order_index");

-- CreateIndex
CREATE INDEX "node_prerequisites_prerequisite_id_idx" ON "node_prerequisites"("prerequisite_id");

-- CreateIndex
CREATE UNIQUE INDEX "concept_cards_node_id_depth_variant_key" ON "concept_cards"("node_id", "depth", "variant");

-- CreateIndex
CREATE INDEX "drills_node_id_kind_idx" ON "drills"("node_id", "kind");

-- CreateIndex
CREATE INDEX "attempts_user_id_created_at_idx" ON "attempts"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "atoms_user_id_due_at_idx" ON "atoms"("user_id", "due_at");

-- CreateIndex
CREATE INDEX "study_sessions_user_id_started_at_idx" ON "study_sessions"("user_id", "started_at");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_nodes" ADD CONSTRAINT "learning_nodes_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_prerequisites" ADD CONSTRAINT "node_prerequisites_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "learning_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_prerequisites" ADD CONSTRAINT "node_prerequisites_prerequisite_id_fkey" FOREIGN KEY ("prerequisite_id") REFERENCES "learning_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_cards" ADD CONSTRAINT "concept_cards_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "learning_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drills" ADD CONSTRAINT "drills_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "learning_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_drill_id_fkey" FOREIGN KEY ("drill_id") REFERENCES "drills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atoms" ADD CONSTRAINT "atoms_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "learning_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atoms" ADD CONSTRAINT "atoms_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_points" ADD CONSTRAINT "resume_points_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_points" ADD CONSTRAINT "resume_points_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

