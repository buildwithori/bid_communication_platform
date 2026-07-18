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
>(({ label, icon, type = "text", placeholder, error, className, readOnly, ...props }, ref) => {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      <span
        className={cn(
          "flex h-11 min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-border bg-card px-3 transition-[background-color,border-color,box-shadow] duration-150 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
          readOnly && "bg-secondary",
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
          className={cn(
            "h-full w-full min-w-0 flex-1 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground read-only:cursor-default read-only:text-muted-foreground",
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
