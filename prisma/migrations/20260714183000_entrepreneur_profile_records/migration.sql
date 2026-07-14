-- CreateTable
CREATE TABLE "programme_goals" (
    "id" TEXT NOT NULL,
    "entrepreneur_user_id" TEXT NOT NULL,
    "programme_id" TEXT,
    "goal_type_id" TEXT NOT NULL,
    "target_amount_cents" INTEGER,
    "description" TEXT,
    "evidence" TEXT,
    "milestone_achieved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programme_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fundraising_rounds" (
    "id" TEXT NOT NULL,
    "entrepreneur_user_id" TEXT NOT NULL,
    "programme_id" TEXT,
    "programme_goal_id" TEXT,
    "name" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "source" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fundraising_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periodic_updates" (
    "id" TEXT NOT NULL,
    "entrepreneur_user_id" TEXT NOT NULL,
    "programme_id" TEXT,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jobs_created" INTEGER NOT NULL DEFAULT 0,
    "jobs_women" INTEGER NOT NULL DEFAULT 0,
    "jobs_men" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "periodic_updates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "programme_goals_entrepreneur_user_id_idx" ON "programme_goals"("entrepreneur_user_id");

-- CreateIndex
CREATE INDEX "programme_goals_programme_id_idx" ON "programme_goals"("programme_id");

-- CreateIndex
CREATE INDEX "programme_goals_goal_type_id_idx" ON "programme_goals"("goal_type_id");

-- CreateIndex
CREATE INDEX "fundraising_rounds_entrepreneur_user_id_date_idx" ON "fundraising_rounds"("entrepreneur_user_id", "date");

-- CreateIndex
CREATE INDEX "fundraising_rounds_programme_id_idx" ON "fundraising_rounds"("programme_id");

-- CreateIndex
CREATE INDEX "fundraising_rounds_programme_goal_id_idx" ON "fundraising_rounds"("programme_goal_id");

-- CreateIndex
CREATE INDEX "periodic_updates_entrepreneur_user_id_period_end_idx" ON "periodic_updates"("entrepreneur_user_id", "period_end");

-- CreateIndex
CREATE INDEX "periodic_updates_programme_id_idx" ON "periodic_updates"("programme_id");

-- AddForeignKey
ALTER TABLE "programme_goals" ADD CONSTRAINT "programme_goals_entrepreneur_user_id_fkey" FOREIGN KEY ("entrepreneur_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_goals" ADD CONSTRAINT "programme_goals_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_goals" ADD CONSTRAINT "programme_goals_goal_type_id_fkey" FOREIGN KEY ("goal_type_id") REFERENCES "programme_goal_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fundraising_rounds" ADD CONSTRAINT "fundraising_rounds_entrepreneur_user_id_fkey" FOREIGN KEY ("entrepreneur_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fundraising_rounds" ADD CONSTRAINT "fundraising_rounds_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fundraising_rounds" ADD CONSTRAINT "fundraising_rounds_programme_goal_id_fkey" FOREIGN KEY ("programme_goal_id") REFERENCES "programme_goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodic_updates" ADD CONSTRAINT "periodic_updates_entrepreneur_user_id_fkey" FOREIGN KEY ("entrepreneur_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodic_updates" ADD CONSTRAINT "periodic_updates_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
