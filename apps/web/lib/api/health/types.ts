export type HealthConnectionStatus = "connected" | "unavailable";
export type HealthConfigurationStatus = "configured" | "not_configured";

export type HealthDependency<TDetails = unknown> = {
  status: HealthConnectionStatus;
  latencyMs: number;
  details?: TDetails;
};

export type HealthQueueCounts = {
  wait: number;
  active: number;
  delayed: number;
  failed: number;
};

export type HealthQueue = {
  name: string;
  counts: HealthQueueCounts;
};

export type HealthQueueDiagnostic = HealthQueue & {
  counts: HealthQueueCounts & { completed: number };
  oldestWaitingAt: string | null;
  oldestWaitingAgeSeconds: number | null;
  lastCompletedAt: string | null;
  schedulers: Array<{
    id: string;
    name: string;
    nextRunAt: string | null;
  }>;
};

export type HealthResourceStatus = "healthy" | "warning" | "critical";

export type DeepHealthDiagnostics = {
  system: {
    disk: {
      status: HealthResourceStatus;
      totalBytes: number;
      availableBytes: number;
      usedPercent: number;
    };
    memory: {
      status: HealthResourceStatus;
      totalBytes: number;
      availableBytes: number;
      usedPercent: number;
      processRssBytes: number;
      processHeapUsedBytes: number;
    };
    cpu: {
      loadAverage: number[];
    };
  };
  queues: HealthQueueDiagnostic[];
  workloads: {
    video: {
      stuckProcessing: number;
      failedLast24Hours: number;
      lastWebhookAt: string | null;
    };
    notifications: {
      failedLast24Hours: number;
      stuckPending: number;
    };
    externalCleanup: {
      backlog: number;
      exhausted: number;
    };
    reportExports: {
      stuckProcessing: number;
      failedLast24Hours: number;
    };
    audit: {
      failedLast24Hours: number;
    };
    calendar: {
      connectionsNeedingAttention: number;
    };
  };
  backup:
    | {
        status: "tracked";
        lastSuccessfulAt: string;
        ageHours: number;
        details: unknown;
      }
    | {
        status: "not_tracked";
        lastSuccessfulAt: null;
        ageHours: null;
        details: null;
      };
  issues: Array<{
    key: string;
    severity: "warning" | "critical";
    message: string;
  }>;
};

export type BackgroundJobsHealth = {
  status: "connected";
  worker: {
    status: "running";
    heartbeatAt: string;
  };
  queues: HealthQueue[];
};

export type HealthDetails = {
  app: string;
  status: "operational" | "degraded" | "unhealthy";
  readinessStatus: "ok" | "unhealthy";
  failed: string[];
  environment: string;
  runtime: {
    uptimeSeconds: number;
    nodeVersion: string;
  };
  dependencies: {
    database: HealthDependency<{ provider: string }>;
    backgroundJobs: HealthDependency<BackgroundJobsHealth>;
    objectStorage: HealthDependency<{ provider: string }>;
    emailDelivery: HealthDependency<{
      transport: string;
      status: string;
    }>;
  };
  integrations: {
    calendar: { status: HealthConfigurationStatus };
    video: { status: HealthConfigurationStatus };
  };
  diagnostics: DeepHealthDiagnostics | null;
  timestamp: string;
};
