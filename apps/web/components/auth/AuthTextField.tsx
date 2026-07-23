"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const AuthTextField = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    icon?: React.ReactNode;
    error?: string;
  }
>(({ label, icon, type = "text", placeholder, error, className, readOnly, disabled, onAnimationStart, onChange, ...props }, ref) => {
  const isLocked = readOnly || disabled;
  const handleAnimationStart = (event: React.AnimationEvent<HTMLInputElement>) => {
    onAnimationStart?.(event);
    if (event.animationName !== "bid-auth-autofill-start") return;

    const input = event.currentTarget;
    window.requestAnimationFrame(() => {
      onChange?.({
        target: input,
        currentTarget: input,
        type: "change",
      } as React.ChangeEvent<HTMLInputElement>);
    });
  };

  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      <span
        className={cn(
          "flex h-11 min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-border bg-card px-3 transition-[background-color,border-color,box-shadow] duration-150",
          !isLocked && "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
          isLocked && "cursor-not-allowed bg-muted text-muted-foreground shadow-none",
          error &&
            "border-destructive focus-within:border-destructive focus-within:ring-destructive/10",
        )}
      >
        {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          readOnly={readOnly}
          disabled={disabled}
          onAnimationStart={handleAnimationStart}
          onChange={onChange}
          className={cn(
            "h-full w-full min-w-0 flex-1 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground",
            isLocked && "cursor-not-allowed text-muted-foreground",
            className,
          )}
          {...props}
        />
      </span>
      {error && (
        <span className="mt-1.5 block text-xs text-destructive">{error}</span>
      )}
    </label>
  );
});

AuthTextField.displayName = "AuthTextField";
