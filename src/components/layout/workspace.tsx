"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useAppState } from "@/components/providers/app-provider";
import { useAudioPlayer } from "@/components/providers/audio-player-provider";
import { SplitWorkspace } from "@/components/layout/split-workspace";
import { Spinner } from "@/components/ui/primitives";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { loadPersistedState, savePersistedState } from "@/hooks/use-persisted-state";
import type { DocumentMode } from "@/types";
import { cn } from "@/lib/utils";

// react-pdf depends on browser APIs, so load it client-only.
const PdfViewer = dynamic(
  () =>
    import("@/components/player/pdf-viewer").then(
      (mod) => mod.PdfViewer
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    ),
  }
);

const URL_REFRESH_MS = 45 * 60 * 1000;

type PdfViewerHandle = {
  nextPage: () => void;
  prevPage: () => void;
  getCurrentPage: () => number | null;
};

function InfoPane() {
  const { activeSession, activeCompany } = useAppState();
  return (
    <div className="h-full overflow-y-auto bg-surface-900 p-4">
      <h3 className="text-sm font-semibold text-zinc-200">Session details</h3>
      {activeSession && activeCompany ? (
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-600">
              Company
            </dt>
            <dd className="text-zinc-300">{activeCompany.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-600">
              Period
            </dt>
            <dd className="text-zinc-300">{activeSession.period}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-600">
              Title
            </dt>
            <dd className="text-zinc-300">{activeSession.title}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-600">
              Created
            </dt>
            <dd className="text-zinc-300">
              {new Date(activeSession.createdAt).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-3 text-sm text-zinc-600">Select a session to begin.</p>
      )}
    </div>
  );
}

export function Workspace() {
  const {
    activeSession,
    audioUrls,
    refreshUrls,
  } = useAppState();
  const {
    load,
    currentTime: audioTime,
    speed,
  } = useAudioPlayer();

  const [mode, setMode] = useState<DocumentMode>(
    () => loadPersistedState().documentMode ?? "horizontal"
  );
  const pdfRef = useRef<PdfViewerHandle | null>(null);
  const urlLoadTimeRef = useRef<number>(0);
  const audioLoadedSessionRef = useRef<string | null>(null);
  const lastLoadedAudioUrlRef = useRef<string | null>(null);
  const latestAudioTimeRef = useRef(0);
  latestAudioTimeRef.current = audioTime;

  const [pdfUrlVersion, setPdfUrlVersion] = useState(0);
  const pdfPageRef = useRef(1);

  // Restore persisted state when a session is selected.
  const persisted = useRef(loadPersistedState());

  // Reset per-session player state when switching sessions.
  useEffect(() => {
    if (!activeSession) return;
    pdfPageRef.current =
      persisted.current.sessionId === activeSession.id &&
      persisted.current.pdfPage
        ? persisted.current.pdfPage
        : 1;
    lastLoadedAudioUrlRef.current = null;
    audioLoadedSessionRef.current = null;
    setPdfUrlVersion((v) => v + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession]);

  // Load audio whenever we have a URL we haven't used yet. On session switch
  // this starts at the persisted timestamp; on a URL refresh (expiry/403)
  // this preserves the in-memory playback position.
  useEffect(() => {
    if (activeSession && audioUrls?.audio && lastLoadedAudioUrlRef.current !== audioUrls.audio) {
      const isNewSession = audioLoadedSessionRef.current !== activeSession.id;
      const startAt =
        isNewSession && persisted.current.sessionId === activeSession.id
          ? persisted.current.audioTimestamp ?? 0
          : latestAudioTimeRef.current || 0;

      lastLoadedAudioUrlRef.current = audioUrls.audio;
      audioLoadedSessionRef.current = activeSession.id;
      urlLoadTimeRef.current = Date.now();
      load(audioUrls.audio, startAt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession, audioUrls, load]);

  const handleUrlFailure = useCallback(() => {
    // Called when the audio element (or PDF) hits a 403/expired-URL error.
    void (async () => {
      await refreshUrls();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshUrls]);

  // Proactively refresh URLs ~45 min after they were fetched.
  useEffect(() => {
    if (!activeSession) return;
    const timer = setInterval(() => {
      const age = Date.now() - urlLoadTimeRef.current;
      if (urlLoadTimeRef.current && age >= URL_REFRESH_MS) {
        void refreshUrls();
        urlLoadTimeRef.current = Date.now();
      }
    }, 60_000);
    return () => clearInterval(timer);
  }, [activeSession, refreshUrls]);

  const nextPage = useCallback(() => pdfRef.current?.nextPage(), []);
  const prevPage = useCallback(() => pdfRef.current?.prevPage(), []);

  useKeyboardShortcuts({ nextPage, prevPage });

  const handlePdfPageChange = useCallback((page: number) => {
    pdfPageRef.current = page;
    savePersistedState({
      ...loadPersistedState(),
      sessionId: activeSession?.id,
      pdfPage: page,
      documentMode: mode,
      playbackSpeed: speed,
    });
  }, [activeSession?.id, mode, speed]);

  // Sync currentTime to localStorage (throttled) while playing.
  useEffect(() => {
    if (!activeSession) return;
    const timer = setInterval(() => {
      if (audioTime > 0) {
        savePersistedState({
          ...loadPersistedState(),
          sessionId: activeSession.id,
          audioTimestamp: audioTime,
          pdfPage: pdfPageRef.current,
          documentMode: mode,
          playbackSpeed: speed,
        });
      }
    }, 5_000);
    return () => clearInterval(timer);
  }, [activeSession, audioTime, mode, speed]);

  // Write back to Notion on unload.
  useEffect(() => {
    const pageId = activeSession?.id;
    if (!pageId) return;

    const flush = () => {
      const state = loadPersistedState();
      if (!state.sessionId || state.sessionId !== pageId) return;
      const payload = JSON.stringify({
        pageId,
        timestampSeconds: state.audioTimestamp ?? 0,
        pdfPage: state.pdfPage ?? 1,
        documentMode: state.documentMode ?? "horizontal",
      });
      try {
        navigator.sendBeacon?.(
          "/api/progress",
          new Blob([payload], { type: "application/json" })
        );
      } catch {
        void fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    };

    const onUnload = () => flush();
    const onPageHide = () => flush();

    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("pagehide", onPageHide);

    const interval = setInterval(flush, 30_000);

    return () => {
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("pagehide", onPageHide);
      clearInterval(interval);
    };
  }, [activeSession?.id]);

  const handleModeToggle = useCallback((next: DocumentMode) => {
    setMode(next);
    savePersistedState({
      ...loadPersistedState(),
      documentMode: next,
      pdfPage: pdfPageRef.current,
      sessionId: activeSession?.id,
    });
  }, [activeSession?.id]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!activeSession ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-zinc-500">
          <svg
            className="h-14 w-14 text-surface-700"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="14" rx="2" />
            <path d="M3 9h18M8 4v14" />
          </svg>
          <p className="text-sm">
            Select a quarter to load its presentation and recording.
          </p>
        </div>
      ) : (
        <>
          <div className="flex shrink-0 items-center justify-between border-b border-surface-800 bg-surface-900 px-4 py-2">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-zinc-100">
                {activeSession.period}
                <span className="ml-2 font-normal text-zinc-500">
                  {activeSession.title}
                </span>
              </h2>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-surface-700 bg-surface-850 p-0.5">
              <button
                onClick={() => handleModeToggle("horizontal")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  mode === "horizontal"
                    ? "bg-accent-600/20 text-accent-400"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
                title="Presentation (one slide at a time)"
              >
                Presentation
              </button>
              <button
                onClick={() => handleModeToggle("vertical")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  mode === "vertical"
                    ? "bg-accent-600/20 text-accent-400"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
                title="Document (scrollable pages)"
              >
                Document
              </button>
            </div>
          </div>

          <SplitWorkspace
            defaultSize={72}
            left={
              audioUrls?.pdf ? (
                <PdfViewer
                  key={`${activeSession.id}-${audioUrls.pdf}-${pdfUrlVersion}`}
                  ref={pdfRef}
                  url={audioUrls.pdf}
                  mode={mode}
                  initialPage={pdfPageRef.current}
                  onPageChange={handlePdfPageChange}
                  onLoadError={handleUrlFailure}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-zinc-600">
                  {audioUrls && !audioUrls.pdf
                    ? "No presentation attached to this session."
                    : "Loading presentation…"}
                </div>
              )
            }
            right={<InfoPane />}
          />
        </>
      )}
    </div>
  );
}