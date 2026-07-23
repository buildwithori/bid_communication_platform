"use client";

import * as React from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { cn } from "@/lib/utils";

export function ToolFramePreview({
  title,
  url,
  type,
  className,
}: {
  title: string;
  url: string;
  type: "online" | "pdf";
  className?: string;
}) {
  const [status, setStatus] = React.useState<
    "loading" | "ready" | "failed"
  >("loading");
  const [takingLonger, setTakingLonger] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    if (status !== "loading") return;
    const timeout = window.setTimeout(() => setTakingLonger(true), 8000);
    return () => window.clearTimeout(timeout);
  }, [attempt, status]);

  function retry() {
    setStatus("loading");
    setTakingLonger(false);
    setAttempt((current) => current + 1);
  }

  return (
    <div
      className={cn(
        "relative min-h-[480px] overflow-hidden rounded-2xl border border-border bg-surface-subtle shadow-sm",
        className,
      )}
    >
      {status === "loading" ? (
        <div
          className="absolute inset-0 z-10 grid place-items-center bg-surface-subtle"
          role="status"
          aria-live="polite"
        >
          <div className="max-w-sm px-6 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bid-light text-bid">
              <LoaderCircle
                className="h-6 w-6 animate-spin"
                aria-hidden="true"
              />
            </span>
            <div className="mt-4 text-base font-semibold text-ink">
              {takingLonger
                ? "This preview is taking a little longer"
                : type === "online"
                  ? "Loading online tool"
                  : "Loading PDF resource"}
            </div>
            <p className="mt-1 text-sm leading-6 text-ink-muted">
              {takingLonger
                ? "You can wait a moment longer or try loading it again."
                : `${title} may take a moment to open.`}
            </p>
            {takingLonger ? (
              <Button variant="outline" className="mt-4" onClick={retry}>
                <RefreshCw className="h-4 w-4" />
                Try again
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
      {status === "failed" ? (
        <div className="absolute inset-0 z-10 grid place-items-center bg-surface-subtle">
          <div className="max-w-sm px-6 text-center">
            <div className="text-base font-semibold text-ink">
              {type === "online"
                ? "The online tool did not load"
                : "The PDF resource did not load"}
            </div>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Check your connection, then try loading it again.
            </p>
            <Button variant="outline" className="mt-4" onClick={retry}>
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          </div>
        </div>
      ) : null}
      <iframe
        key={attempt}
        title={`${title} preview`}
        src={url}
        loading="eager"
        sandbox={
          type === "online"
            ? "allow-forms allow-popups allow-same-origin allow-scripts"
            : undefined
        }
        onLoad={() => {
          setStatus("ready");
          setTakingLonger(false);
        }}
        onError={() => setStatus("failed")}
        className={cn(
          "h-[68vh] min-h-[480px] w-full bg-white transition-opacity duration-300 motion-reduce:transition-none",
          status === "ready" ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
