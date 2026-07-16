import type {
  SessionAvailabilityQuery,
  SessionQuery,
  SessionTeamMemberQuery,
} from "./types";
export const sessionKeys = {
  all: ["sessions"] as const,
  lists: () => [...sessionKeys.all, "list"] as const,
  list: (query: Omit<SessionQuery, "cursor"> & { cursor?: string }) =>
    [...sessionKeys.lists(), query] as const,
  details: () => [...sessionKeys.all, "detail"] as const,
  detail: (id: string) => [...sessionKeys.details(), id] as const,
  teamMembers: (query: Omit<SessionTeamMemberQuery, "cursor">) =>
    [...sessionKeys.all, "team-members", query] as const,
  availability: (query: SessionAvailabilityQuery) =>
    [...sessionKeys.all, "availability", query] as const,
};
