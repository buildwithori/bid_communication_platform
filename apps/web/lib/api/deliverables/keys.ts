import type { DeliverableGroupQuery, DeliverableQuery } from "./types";

export const deliverableKeys = {
  all: ["deliverables"] as const,
  groups: () => [...deliverableKeys.all, "groups"] as const,
  groupList: (query?: DeliverableGroupQuery) =>
    [...deliverableKeys.groups(), query ?? {}] as const,
  instances: () => [...deliverableKeys.all, "instances"] as const,
  instanceList: (query?: DeliverableQuery) =>
    [...deliverableKeys.instances(), query ?? {}] as const,
  instance: (id: string) => [...deliverableKeys.instances(), id] as const,
  reviewQueues: () => [...deliverableKeys.all, "review-queues"] as const,
  reviewQueue: (query?: DeliverableQuery) =>
    [...deliverableKeys.reviewQueues(), query ?? {}] as const,
  submissions: (instanceId: string) =>
    [...deliverableKeys.instances(), instanceId, "submissions"] as const,
  feedback: (instanceId: string) =>
    [...deliverableKeys.instances(), instanceId, "feedback"] as const,
};
