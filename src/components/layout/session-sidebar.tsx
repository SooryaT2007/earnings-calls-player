"use client";

import { useAppState } from "@/components/providers/app-provider";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/primitives";

export function SessionSidebar() {
  const {
    sessions,
    sessionsLoading,
    activeSession,
    setActiveSession,
    activeCompany,
  } = useAppState();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-surface-800 bg-surface-900">
      <div className="border-b border-surface-800 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {activeCompany ? activeCompany.name : "Quarters"}
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {!activeCompany && (
          <p className="px-3 py-4 text-sm text-zinc-600">
            Select a company to see its earnings sessions.
          </p>
        )}
        {activeCompany && sessionsLoading && sessions.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-3 py-6">
            <Spinner className="h-5 w-5" />
            <span className="text-sm text-zinc-600">Loading sessions…</span>
          </div>
        )}
        {activeCompany && !sessionsLoading && sessions.length === 0 && (
          <p className="px-3 py-4 text-sm text-zinc-600">
            No sessions for {activeCompany.name} yet. Upload one to get started.
          </p>
        )}
        <ul className="flex flex-col gap-0.5 px-2">
          {sessions.map((session) => {
            const active = session.id === activeSession?.id;
            return (
              <li key={session.id}>
                <button
                  onClick={() => setActiveSession(session)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "bg-accent-600/15 text-accent-400"
                      : "text-zinc-300 hover:bg-surface-800 hover:text-zinc-100"
                  )}
                >
                  <span className="block truncate font-medium">{session.period}</span>
                  <span className="block truncate text-xs text-zinc-500">
                    {session.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}