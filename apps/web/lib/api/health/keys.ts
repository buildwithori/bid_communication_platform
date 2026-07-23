export const healthKeys = {
  all: ["health"] as const,
  details: () => [...healthKeys.all, "details"] as const,
};
