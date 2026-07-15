import { apiRequest } from "../client";
import type {
  CalendarAuthorization,
  CalendarConnection,
} from "./types";

export function getCalendarConnectionRequest() {
  return apiRequest<CalendarConnection>("/calendar/connection");
}

export function createCalendarAuthorizationRequest() {
  return apiRequest<CalendarAuthorization>(
    "/calendar/google/authorization",
    { method: "POST" },
  );
}

export function disconnectCalendarRequest() {
  return apiRequest<CalendarConnection>("/calendar/connection", {
    method: "DELETE",
  });
}
