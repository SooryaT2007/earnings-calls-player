"use client";

import { useEffect, useState } from "react";
import { useAppState } from "@/components/providers/app-provider";
import { cn } from "@/lib/utils";
import { Button, Spinner, IconButton, Tooltip } from "@/components/ui/primitives";

export function TopNavigation({
  onOpenUpload,
  onOpenShortcuts,
}: {
  onOpenUpload: () => void;
  onOpenShortcuts: () => void;
}) {
  const {
    companies,
    filteredCompanies,
    activeCompany,
    setActiveCompany,
    sectors,
    activeSector,
    setActiveSector,
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
    <header className="shrink-0 border-b border-surface-800 bg-surface-900 shadow-md">
      {/* Tier 1: App Header & Sector Tabs */}
      <div className="flex h-12 items-center justify-between border-b border-surface-800/80 px-4">
        <div className="flex items-center gap-6 overflow-hidden">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-500 text-white shadow-md shadow-sky-500/20">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <span className="whitespace-nowrap font-bold tracking-tight text-white text-sm">
              Earnings Calls
            </span>
          </div>

          <div className="h-4 w-px bg-surface-800" />

          {/* Sector Tabs */}
          <nav aria-label="Sectors" className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mr-1">
              Sector:
            </span>
            {sectors.map((sector) => {
              const active = sector === activeSector;
              const count = sector === "All"
                ? companies.length
                : companies.filter((c) => c.sectors?.includes(sector)).length;

              return (
                <button
                  key={sector}
                  onClick={() => setActiveSector(sector)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                    active
                      ? "bg-sky-500/20 text-sky-400 font-semibold ring-1 ring-sky-500/40 shadow-sm shadow-sky-500/10"
                      : "text-zinc-400 hover:bg-surface-800 hover:text-zinc-200"
                  )}
                >
                  <span>{sector}</span>
                  <span className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px]",
                    active ? "bg-sky-500/30 text-sky-300" : "bg-surface-800 text-zinc-500"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Shortcuts cheatsheet button */}
          <Tooltip label="Keyboard shortcuts (?)">
            <IconButton
              onClick={onOpenShortcuts}
              title="Keyboard shortcuts (?)"
              className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M6 16h12" strokeLinecap="round" strokeWidth="2.5" />
              </svg>
            </IconButton>
          </Tooltip>

          {/* Upload Button */}
          <Button
            variant="accent"
            onClick={onOpenUpload}
            disabled={!activeCompany}
            className="h-8 px-3 text-xs shadow-md shadow-sky-600/20"
            title={activeCompany ? "Upload a new session (U)" : "Select a company first"}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Upload</span>
            <kbd className="ml-1 hidden rounded bg-sky-700/60 px-1 py-0.2 text-[10px] font-mono sm:inline">U</kbd>
          </Button>

          {loggedIn && (
            <Button variant="ghost" onClick={handleLogout} disabled={loggingOut} className="h-8 px-2.5 text-xs text-zinc-400">
              {loggingOut ? <Spinner className="h-3.5 w-3.5" /> : "Sign out"}
            </Button>
          )}
        </div>
      </div>

      {/* Tier 2: Company Selector */}
      <div className="flex h-10 items-center justify-between bg-surface-950/60 px-4 py-1">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 whitespace-nowrap">
            Companies:
          </span>

          {loading ? (
            <span className="flex items-center gap-2 text-xs text-zinc-500">
              <Spinner className="h-3.5 w-3.5" />
              Loading companies…
            </span>
          ) : (
            filteredCompanies.map((company) => {
              const active = company.id === activeCompany?.id;
              return (
                <button
                  key={company.id}
                  onClick={() => setActiveCompany(company)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs transition-all",
                    active
                      ? "bg-surface-800 text-zinc-100 font-semibold ring-1 ring-surface-600 shadow-sm"
                      : "text-zinc-400 hover:bg-surface-850 hover:text-zinc-200"
                  )}
                >
                  <span className={cn(active && "text-sky-400")}>{company.name}</span>
                  {company.ticker && (
                    <span className="rounded bg-surface-900 px-1 py-0.2 text-[10px] font-mono text-zinc-500">
                      {company.ticker}
                    </span>
                  )}
                </button>
              );
            })
          )}

          {!loading && filteredCompanies.length === 0 && (
            <span className="text-xs text-zinc-600">
              No companies found in {activeSector} sector.
            </span>
          )}
        </div>

        {activeCompany && (
          <span className="hidden text-xs text-zinc-500 lg:inline whitespace-nowrap">
            {sessions.length} session{sessions.length === 1 ? "" : "s"} available
          </span>
        )}
      </div>
    </header>
  );
}