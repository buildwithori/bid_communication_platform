import { apiRequest } from "../client";
import type { HealthDetails } from "./types";

export const getHealthDetailsRequest = () =>
  apiRequest<HealthDetails>("/health/details");
