import type { DeliverableQuery } from "./types";

export const deliverableKeys = {
  all: ["deliverables"] as const,
  instances: () => [...deliverableKeys.all, "instances"] as const,
  instanceList: (query?: DeliverableQuery) =>
    [...deliverableKeys.instances(), query ?? {}] as const,
  reviewQueues: () => [...deliverableKeys.all, "review-queues"] as const,
  reviewQueue: (query?: DeliverableQuery) =>
    [...deliverableKeys.reviewQueues(), query ?? {}] as const,
  submissions: (instanceId: string) =>
    [...deliverableKeys.instances(), instanceId, "submissions"] as const,
  feedback: (instanceId: string) =>
    [...deliverableKeys.instances(), instanceId, "feedback"] as const,
};
