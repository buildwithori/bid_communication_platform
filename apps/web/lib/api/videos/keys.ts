export const videoKeys = {
  all: ["videos"] as const,
  asset: (id: string) => [...videoKeys.all, "asset", id] as const,
  playback: (id: string) => [...videoKeys.all, "playback", id] as const,
};
