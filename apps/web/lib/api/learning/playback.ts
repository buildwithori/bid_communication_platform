"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { learningKeys } from "./keys";
import { syncLearnerProgressRequest } from "./requests";
import type {
  ContentProgressRecord,
  LearnerContentProgressInput,
  LearnerProgressLookup,
  LearnerProgressStatus,
} from "./types";

const NETWORK_SYNC_INTERVAL_MS = 20_000;
const LOCAL_SYNC_INTERVAL_MS = 4_000;
const MIN_NETWORK_POSITION_DELTA_SECONDS = 5;
const CHECKPOINT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1_000;
const RESUME_CONTEXT_SECONDS = 2;
const STORAGE_PREFIX = "bid-hub:playback:v1";

type PlaybackContext = {
  userId: string;
  programmeId: string;
  moduleId: string;
  contentItemId: string;
};

type ServerPlaybackProgress = Pick<
  ContentProgressRecord,
  | "status"
  | "progressPercent"
  | "lastPositionSeconds"
  | "durationSeconds"
  | "lastSyncedAt"
>;

type StoredPlaybackCheckpoint = LearnerContentProgressInput & {
  userId: string;
};

type PlaybackProgressOptions = {
  enabled: boolean;
  context: PlaybackContext | null;
  serverProgress: ServerPlaybackProgress | null | undefined;
  contentDurationSeconds?: number | null;
};

function contextKey(context: PlaybackContext) {
  return [
    STORAGE_PREFIX,
    context.userId,
    context.programmeId,
    context.moduleId,
    context.contentItemId,
  ].join(":");
}

function checkpointMatches(
  checkpoint: StoredPlaybackCheckpoint,
  context: PlaybackContext,
) {
  return (
    checkpoint.userId === context.userId &&
    checkpoint.programmeId === context.programmeId &&
    checkpoint.moduleId === context.moduleId &&
    checkpoint.contentItemId === context.contentItemId
  );
}

function readCheckpoint(context: PlaybackContext) {
  if (typeof window === "undefined") return null;
  const key = contextKey(context);
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const checkpoint = JSON.parse(raw) as StoredPlaybackCheckpoint;
    const eventTime = Date.parse(checkpoint.clientEventAt);
    const valid =
      checkpointMatches(checkpoint, context) &&
      Number.isFinite(eventTime) &&
      Date.now() - eventTime <= CHECKPOINT_MAX_AGE_MS &&
      Number.isInteger(checkpoint.lastPositionSeconds) &&
      (checkpoint.lastPositionSeconds ?? -1) >= 0 &&
      Number.isInteger(checkpoint.progressPercent) &&
      checkpoint.progressPercent >= 0 &&
      checkpoint.progressPercent <= 100;
    if (valid) return checkpoint;
    window.localStorage.removeItem(key);
  } catch {
    window.localStorage.removeItem(key);
  }
  return null;
}

function writeCheckpoint(checkpoint: StoredPlaybackCheckpoint) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      contextKey(checkpoint),
      JSON.stringify(checkpoint),
    );
  } catch {
    // Progress still syncs to the server when browser storage is unavailable.
  }
}

function removeCheckpoint(context: PlaybackContext) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(contextKey(context));
  } catch {
    // Storage may be unavailable in private or restricted browser contexts.
  }
}

function inputFromCheckpoint(
  checkpoint: StoredPlaybackCheckpoint,
): LearnerContentProgressInput {
  const { userId, ...input } = checkpoint;
  void userId;
  return input;
}

function eventTime(value?: string | null) {
  const time = value ? Date.parse(value) : 0;
  return Number.isFinite(time) ? time : 0;
}

function resumePosition(status: LearnerProgressStatus, position: number) {
  if (status === "completed") return 0;
  return Math.max(0, position - RESUME_CONTEXT_SECONDS);
}

function normaliseDuration(value?: number | null) {
  if (!value || !Number.isFinite(value)) return undefined;
  return Math.max(1, Math.min(86_400, Math.round(value)));
}

function normalisePosition(value: number, duration?: number) {
  const rounded = Math.max(0, Math.round(value));
  return duration === undefined ? Math.min(86_400, rounded) : Math.min(duration, rounded);
}

export function usePlaybackProgressCheckpoint({
  enabled,
  context,
  serverProgress,
  contentDurationSeconds,
}: PlaybackProgressOptions) {
  const queryClient = useQueryClient();
  const key = context ? contextKey(context) : null;
  const [hydratedKey, setHydratedKey] = React.useState<string | null>(null);
  const [resumePositionSeconds, setResumePositionSeconds] = React.useState(0);
  const latestRef = React.useRef<StoredPlaybackCheckpoint | null>(null);
  const lastSentEventAtRef = React.useRef(0);
  const lastSentPositionRef = React.useRef(0);
  const lastNetworkSyncRef = React.useRef(0);
  const lastLocalSyncRef = React.useRef(0);
  const playbackStartedRef = React.useRef(false);
  const inFlightRef = React.useRef<Promise<void> | null>(null);
  const forceAfterFlightRef = React.useRef(false);
  const lastLifecycleEventAtRef = React.useRef(0);
  const flushRef = React.useRef<() => Promise<void>>(async () => undefined);

  React.useEffect(() => {
    if (!enabled || !context || !key) {
      latestRef.current = null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser checkpoint hydration is an external storage synchronization
      setHydratedKey(null);
      setResumePositionSeconds(0);
      return;
    }

    const serverEventTime = eventTime(serverProgress?.lastSyncedAt);
    const serverPosition = serverProgress?.lastPositionSeconds ?? 0;
    const stored = readCheckpoint(context);
    const storedIsNewer =
      stored !== null &&
      eventTime(stored.clientEventAt) > serverEventTime &&
      serverProgress?.status !== "completed";

    if (hydratedKey !== key) {
      latestRef.current = storedIsNewer ? stored : null;
      lastSentEventAtRef.current = serverEventTime;
      lastSentPositionRef.current = serverPosition;
      lastNetworkSyncRef.current = Date.now();
      lastLocalSyncRef.current = 0;
      playbackStartedRef.current = false;
      if (!storedIsNewer && stored) removeCheckpoint(context);
      const status = storedIsNewer
        ? stored.status
        : (serverProgress?.status ?? "not_started");
      const position = storedIsNewer
        ? (stored.lastPositionSeconds ?? 0)
        : serverPosition;
      setResumePositionSeconds(resumePosition(status, position));
      setHydratedKey(key);
      return;
    }

    if (
      !playbackStartedRef.current &&
      !latestRef.current &&
      serverEventTime > lastSentEventAtRef.current
    ) {
      lastSentEventAtRef.current = serverEventTime;
      lastSentPositionRef.current = serverPosition;
      setResumePositionSeconds(
        resumePosition(serverProgress?.status ?? "not_started", serverPosition),
      );
    }
  }, [
    context,
    enabled,
    hydratedKey,
    key,
    serverProgress?.lastPositionSeconds,
    serverProgress?.lastSyncedAt,
    serverProgress?.status,
  ]);

  const updateProgressCache = React.useCallback(
    (checkpoint: StoredPlaybackCheckpoint) => {
      const query = {
        programmeId: checkpoint.programmeId,
        moduleId: checkpoint.moduleId,
        contentItemId: checkpoint.contentItemId,
      };
      queryClient.setQueryData<LearnerProgressLookup>(
        learningKeys.progressLookup(query),
        (current: LearnerProgressLookup | undefined) => {
          if (!current) return current;
          const previous = current.content;
          return {
            ...current,
            content: {
              programmeId: checkpoint.programmeId,
              moduleId: checkpoint.moduleId,
              contentItemId: checkpoint.contentItemId,
              status: checkpoint.status,
              progressPercent: Math.max(
                previous?.progressPercent ?? 0,
                checkpoint.progressPercent,
              ),
              lastPositionSeconds: checkpoint.lastPositionSeconds ?? null,
              durationSeconds:
                checkpoint.durationSeconds ?? previous?.durationSeconds ?? null,
              startedAt:
                previous?.startedAt ??
                (checkpoint.status === "not_started"
                  ? null
                  : checkpoint.clientEventAt),
              completedAt:
                previous?.completedAt ??
                (checkpoint.status === "completed"
                  ? checkpoint.clientEventAt
                  : null),
              lastOpenedAt: checkpoint.clientEventAt,
              lastSyncedAt: checkpoint.clientEventAt,
              source: checkpoint.source,
            },
          };
        },
      );
    },
    [queryClient],
  );

  const sendCheckpoint = React.useCallback(
    async (checkpoint: StoredPlaybackCheckpoint, keepalive: boolean) => {
      const result = await syncLearnerProgressRequest(
        [inputFromCheckpoint(checkpoint)],
        { keepalive },
      );
      lastNetworkSyncRef.current = Date.now();
      lastSentEventAtRef.current = Math.max(
        lastSentEventAtRef.current,
        eventTime(checkpoint.clientEventAt),
      );
      lastSentPositionRef.current = checkpoint.lastPositionSeconds ?? 0;
      if (result.syncedItems > 0) updateProgressCache(checkpoint);

      const latest = latestRef.current;
      if (
        !latest ||
        eventTime(latest.clientEventAt) <= eventTime(checkpoint.clientEventAt)
      ) {
        removeCheckpoint(checkpoint);
      } else {
        writeCheckpoint(latest);
      }

      if (result.ignoredItems > 0) {
        void queryClient.invalidateQueries({
          queryKey: learningKeys.progressLookup({
            programmeId: checkpoint.programmeId,
            moduleId: checkpoint.moduleId,
            contentItemId: checkpoint.contentItemId,
          }),
        });
      }
    },
    [queryClient, updateProgressCache],
  );

  const flush = React.useCallback(async () => {
    const checkpoint = latestRef.current;
    const checkpointTime = eventTime(checkpoint?.clientEventAt);
    if (
      !checkpoint ||
      checkpointTime <= lastSentEventAtRef.current
    ) {
      return;
    }
    writeCheckpoint(checkpoint);
    if (inFlightRef.current) {
      forceAfterFlightRef.current = true;
      return inFlightRef.current;
    }

    const request = sendCheckpoint(checkpoint, false)
      .catch(() => {
        writeCheckpoint(latestRef.current ?? checkpoint);
      })
      .finally(() => {
        inFlightRef.current = null;
        if (forceAfterFlightRef.current) {
          forceAfterFlightRef.current = false;
          void flushRef.current();
        }
      });
    inFlightRef.current = request;
    return request;
  }, [sendCheckpoint]);
  React.useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const flushLifecycle = React.useCallback(() => {
    const checkpoint = latestRef.current;
    const checkpointTime = eventTime(checkpoint?.clientEventAt);
    if (
      !checkpoint ||
      checkpointTime <= lastSentEventAtRef.current ||
      checkpointTime <= lastLifecycleEventAtRef.current
    ) {
      return;
    }
    lastLifecycleEventAtRef.current = checkpointTime;
    writeCheckpoint(checkpoint);
    void sendCheckpoint(checkpoint, true).catch(() => {
      if (lastLifecycleEventAtRef.current === checkpointTime) {
        lastLifecycleEventAtRef.current = 0;
      }
      writeCheckpoint(latestRef.current ?? checkpoint);
    });
  }, [sendCheckpoint]);

  React.useEffect(() => {
    if (!enabled || !key) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushLifecycle();
    };
    const onPageHide = () => flushLifecycle();
    const onOnline = () => void flushRef.current();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("online", onOnline);
    return () => {
      flushLifecycle();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("online", onOnline);
    };
  }, [enabled, flushLifecycle, key]);

  const record = React.useCallback(
    (positionSeconds: number, durationSeconds?: number) => {
      if (!enabled || !context || !Number.isFinite(positionSeconds)) return;
      playbackStartedRef.current = true;
      const duration =
        normaliseDuration(durationSeconds) ??
        normaliseDuration(contentDurationSeconds) ??
        normaliseDuration(serverProgress?.durationSeconds);
      const position = normalisePosition(positionSeconds, duration);
      const previousProgress = Math.max(
        serverProgress?.progressPercent ?? 0,
        latestRef.current?.progressPercent ?? 0,
      );
      const completed = serverProgress?.status === "completed";
      const watchedPercent = duration
        ? Math.min(
            99,
            Math.max(1, Math.floor(((position / duration) * 100) / 5) * 5),
          )
        : Math.max(1, previousProgress);
      const checkpoint: StoredPlaybackCheckpoint = {
        userId: context.userId,
        programmeId: context.programmeId,
        moduleId: context.moduleId,
        contentItemId: context.contentItemId,
        status: completed ? "completed" : "in_progress",
        progressPercent: completed
          ? 100
          : Math.max(previousProgress, watchedPercent),
        lastPositionSeconds: position,
        ...(duration === undefined ? {} : { durationSeconds: duration }),
        clientEventAt: new Date().toISOString(),
        source: "player",
      };
      latestRef.current = checkpoint;

      const now = Date.now();
      if (now - lastLocalSyncRef.current >= LOCAL_SYNC_INTERVAL_MS) {
        writeCheckpoint(checkpoint);
        lastLocalSyncRef.current = now;
      }
      const movedEnough =
        Math.abs(position - lastSentPositionRef.current) >=
        MIN_NETWORK_POSITION_DELTA_SECONDS;
      if (
        movedEnough &&
        now - lastNetworkSyncRef.current >= NETWORK_SYNC_INTERVAL_MS
      ) {
        void flushRef.current();
      }
    },
    [
      contentDurationSeconds,
      context,
      enabled,
      serverProgress?.durationSeconds,
      serverProgress?.progressPercent,
      serverProgress?.status,
    ],
  );

  const restart = React.useCallback(() => {
    if (!enabled || !context) return;
    const duration =
      normaliseDuration(contentDurationSeconds) ??
      normaliseDuration(serverProgress?.durationSeconds);
    const completed = serverProgress?.status === "completed";
    const checkpoint: StoredPlaybackCheckpoint = {
      userId: context.userId,
      programmeId: context.programmeId,
      moduleId: context.moduleId,
      contentItemId: context.contentItemId,
      status: completed ? "completed" : "in_progress",
      progressPercent: completed
        ? 100
        : Math.max(serverProgress?.progressPercent ?? 0, 1),
      lastPositionSeconds: 0,
      ...(duration === undefined ? {} : { durationSeconds: duration }),
      clientEventAt: new Date().toISOString(),
      source: "player",
    };
    latestRef.current = checkpoint;
    setResumePositionSeconds(0);
    writeCheckpoint(checkpoint);
    void flushRef.current();
  }, [
    contentDurationSeconds,
    context,
    enabled,
    serverProgress?.durationSeconds,
    serverProgress?.progressPercent,
    serverProgress?.status,
  ]);

  const clear = React.useCallback(() => {
    if (context) removeCheckpoint(context);
    latestRef.current = null;
    lastSentEventAtRef.current = Date.now();
  }, [context]);

  return {
    isHydrated: !enabled || !key || hydratedKey === key,
    resumePositionSeconds,
    record,
    flush,
    restart,
    clear,
  };
}
