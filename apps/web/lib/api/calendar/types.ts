export type CalendarConnection = {
  connected: boolean;
  provider: "google";
  accountEmail: string | null;
  scopes: string[];
  lastSyncedAt: string | null;
};

export type CalendarAuthorization = {
  url: string;
};
