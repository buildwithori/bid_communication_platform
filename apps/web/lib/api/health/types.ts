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
  status: "ok" | "unhealthy";
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
  timestamp: string;
};
