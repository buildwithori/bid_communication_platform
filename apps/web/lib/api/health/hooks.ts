"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApiError } from "../client";
import { healthKeys } from "./keys";
import { getHealthDetailsRequest } from "./requests";
import type { HealthDetails } from "./types";

export const useHealthDetailsQuery = () =>
  useQuery<HealthDetails, ApiError>({
    queryKey: healthKeys.details(),
    queryFn: getHealthDetailsRequest,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 15_000,
  });
