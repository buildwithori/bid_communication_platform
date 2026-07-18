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
>(({ label, icon, type = "text", placeholder, error, ...props }, ref) => {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      <span
        className={cn(
          "flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-3 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15",
          error &&
            "border-destructive focus-within:border-destructive focus-within:ring-destructive/10",
        )}
      >
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
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
