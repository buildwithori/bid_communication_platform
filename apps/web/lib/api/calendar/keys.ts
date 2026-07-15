export const calendarKeys = {
  all: ["calendar"] as const,
  connection: () => [...calendarKeys.all, "connection"] as const,
};
