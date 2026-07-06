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
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <span
        className={cn(
          "flex h-11 items-center gap-2 rounded-lg border border-line bg-white px-3 transition focus-within:border-bid focus-within:ring-2 focus-within:ring-bid/15",
          error &&
            "border-danger focus-within:border-danger focus-within:ring-danger/10",
        )}
      >
        {icon && <span className="text-ink-faint">{icon}</span>}
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
          {...props}
        />
      </span>
      {error && (
        <span className="mt-1.5 block text-xs text-danger">{error}</span>
      )}
    </label>
  );
});

AuthTextField.displayName = "AuthTextField";
