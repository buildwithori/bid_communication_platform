"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contentKeys } from "../content/keys";
import { programmeKeys } from "../programmes/keys";
import { learningKeys } from "./keys";
import {
  getLearnerProgressRequest,
  getTrainingCatalogueSummaryRequest,
  syncLearnerProgressRequest,
} from "./requests";
import type {
  LearnerContentProgressInput,
  LearnerProgressQuery,
} from "./types";

export const useTrainingCatalogueSummaryQuery = () =>
  useQuery({
    queryKey: learningKeys.catalogueSummary(),
    queryFn: getTrainingCatalogueSummaryRequest,
  });

export const useLearnerProgressQuery = (
  query: LearnerProgressQuery | null,
) =>
  useQuery({
    queryKey: learningKeys.progressLookup(
      query ?? { programmeId: "none" },
    ),
    queryFn: () => getLearnerProgressRequest(query as LearnerProgressQuery),
    enabled: Boolean(query?.programmeId),
  });

export const useSyncLearnerProgressMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: LearnerContentProgressInput[]) =>
      syncLearnerProgressRequest(items),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: learningKeys.all });
      void queryClient.invalidateQueries({ queryKey: programmeKeys.all });
      void queryClient.invalidateQueries({ queryKey: contentKeys.all });
      for (const programmeId of result.programmeIds) {
        void queryClient.invalidateQueries({
          queryKey: programmeKeys.detail(programmeId),
        });
      }
    },
  });
};
