CREATE TABLE "deployment_task_runs" (
    "key" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB,

    CONSTRAINT "deployment_task_runs_pkey" PRIMARY KEY ("key")
);
