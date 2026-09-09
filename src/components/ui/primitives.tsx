"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Button({
  className,
  variant = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost" | "outline" | "accent";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500",
        "disabled:pointer-events-none disabled:opacity-50",
        variant === "default" &&
          "bg-surface-700 text-zinc-100 hover:bg-surface-600",
        variant === "ghost" &&
          "text-zinc-300 hover:bg-surface-800 hover:text-zinc-100",
        variant === "outline" &&
          "border border-surface-600 bg-transparent text-zinc-300 hover:bg-surface-800",
        variant === "accent" &&
          "bg-accent-600 text-white hover:bg-accent-500",
        className
      )}
      {...props}
    />
  );
}

export function IconButton({
  className,
  title,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { title?: string }) {
  return (
    <button
      title={title}
      aria-label={title}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-300",
        "transition-colors hover:bg-surface-700 hover:text-zinc-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500",
        "disabled:pointer-events-none disabled:opacity-40",
        className
      )}
      {...props}
    />
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block h-5 w-5 animate-spin rounded-full border-2 border-surface-600 border-t-accent-500",
        className
      )}
    />
  );
}

export function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5",
          "-translate-x-1/2 whitespace-nowrap rounded-md bg-surface-800",
          "px-2 py-1 text-xs text-zinc-200 opacity-0 shadow-lg",
          "transition-opacity group-hover:opacity-100"
        )}
      >
        {label}
      </span>
    </span>
  );
}