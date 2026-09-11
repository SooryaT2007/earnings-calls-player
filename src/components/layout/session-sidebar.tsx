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
    <aside className="flex w-60 shrink-0 flex-col border-r border-surface-800 bg-surface-900">
      <div className="flex items-center justify-between border-b border-surface-800 px-3.5 py-3">
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
            Company Quarters
          </span>
          <span className="truncate text-xs font-semibold text-zinc-200 block">
            {activeCompany ? activeCompany.name : "Select a company"}
          </span>
        </div>
        {activeCompany?.ticker && (
          <span className="rounded bg-surface-800 px-1.5 py-0.5 text-[10px] font-mono text-sky-400">
            {activeCompany.ticker}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {!activeCompany && (
          <p className="px-3.5 py-4 text-xs text-zinc-500">
            Select a sector and company above to see quarterly earnings sessions.
          </p>
        )}
        {activeCompany && sessionsLoading && sessions.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-3 py-8 text-xs text-zinc-500">
            <Spinner className="h-5 w-5" />
            <span>Loading sessions…</span>
          </div>
        )}
        {activeCompany && !sessionsLoading && sessions.length === 0 && (
          <div className="px-3.5 py-6 text-center text-xs text-zinc-500">
            <p className="mb-2">No sessions for {activeCompany.name} yet.</p>
            <p className="text-[11px] text-zinc-600">Press <kbd className="rounded bg-surface-800 px-1 py-0.2 text-zinc-400">U</kbd> to upload</p>
          </div>
        )}
        <ul className="flex flex-col gap-1 px-2">
          {sessions.map((session) => {
            const active = session.id === activeSession?.id;
            const hasAudio = Boolean(session.audioFileId || session.audioUrl);
            const hasPdf = Boolean(session.pdfFileId || session.pdfUrl);

            return (
              <li key={session.id}>
                <button
                  onClick={() => setActiveSession(session)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "w-full rounded-lg px-3 py-2 text-left text-xs transition-all",
                    active
                      ? "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30 shadow-sm"
                      : "text-zinc-300 hover:bg-surface-800/80 hover:text-zinc-100"
                  )}
                >
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className={cn("truncate font-semibold", active ? "text-sky-300" : "text-zinc-200")}>
                      {session.period}
                    </span>
                    <div className="flex items-center gap-1 shrink-0 text-zinc-500">
                      {hasAudio && (
                        <span title="Audio call replay available" className="text-[11px] text-sky-400/80">
                          🎵
                        </span>
                      )}
                      {hasPdf && (
                        <span title="Presentation slides available" className="text-[11px] text-amber-400/80">
                          📄
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="block truncate text-[11px] text-zinc-400">
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