"use client";

import { useEffect, useState } from "react";
import { useAppState } from "@/components/providers/app-provider";
import { cn } from "@/lib/utils";
import { Button, Spinner } from "@/components/ui/primitives";

export function TopNavigation({
  onOpenUpload,
}: {
  onOpenUpload: () => void;
}) {
  const {
    companies,
    activeCompany,
    setActiveCompany,
    loading,
    sessions,
  } = useAppState();

  const [loggedIn, setLoggedIn] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((body) => setLoggedIn(Boolean(body.authenticated)))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-surface-800 bg-surface-900 px-4">
      <div className="flex items-center gap-6">
        <h1 className="whitespace-nowrap text-sm font-semibold tracking-wide text-zinc-100">
          Earnings Calls
        </h1>

        <nav
          aria-label="Companies"
          className="flex items-center gap-1 overflow-x-auto"
        >
          {loading ? (
            <span className="flex items-center gap-2 px-2 text-sm text-zinc-500">
              <Spinner className="h-4 w-4" />
              Loading companies…
            </span>
          ) : (
            companies.map((company) => {
              const active = company.id === activeCompany?.id;
              return (
                <button
                  key={company.id}
                  onClick={() => setActiveCompany(company)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-accent-600/15 text-accent-400"
                      : "text-zinc-400 hover:bg-surface-800 hover:text-zinc-200"
                  )}
                >
                  {company.name}
                </button>
              );
            })
          )}
          {!loading && companies.length === 0 && (
            <span className="text-sm text-zinc-600">
              No companies configured.
            </span>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {activeCompany && (
          <span className="hidden text-sm text-zinc-500 md:inline">
            {sessions.length} session{sessions.length === 1 ? "" : "s"}
          </span>
        )}
        {loggedIn && (
          <Button variant="ghost" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <path d="M16 17l5-5-5-5M21 12H9" />
              </svg>
            )}
            Sign out
          </Button>
        )}
        <Button
          variant="accent"
          onClick={onOpenUpload}
          disabled={!activeCompany}
          title={activeCompany ? "Upload a new earnings session" : "Select a company first"}
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Upload New Session
        </Button>
      </div>
    </header>
  );
}