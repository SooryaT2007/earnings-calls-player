"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useAppState } from "@/components/providers/app-provider";
import { useAudioPlayer } from "@/components/providers/audio-player-provider";
import { SplitWorkspace } from "@/components/layout/split-workspace";
import { Spinner } from "@/components/ui/primitives";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  getSessionPersistedState,
  saveSessionPersistedState,
} from "@/hooks/use-persisted-state";
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
  goToPage: (p: number) => void;
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
            <dd className="text-zinc-300 font-medium text-sky-400">{activeSession.period}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-600">
              Session Title
            </dt>
            <dd className="text-zinc-300">{activeSession.title}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-600">
              Audio Recording
            </dt>
            <dd className="text-xs text-zinc-400 truncate">
              {activeSession.audioFileId ?? "None attached"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-600">
              Presentation PDF
            </dt>
            <dd className="text-xs text-zinc-400 truncate">
              {activeSession.pdfFileId ?? "None attached"}
            </dd>
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
    reset: resetAudio,
    currentTime: audioTime,
    speed,
  } = useAudioPlayer();

  const [mode, setMode] = useState<DocumentMode>("horizontal");
  const pdfRef = useRef<PdfViewerHandle | null>(null);
  const urlLoadTimeRef = useRef<number>(0);
  const audioLoadedSessionRef = useRef<string | null>(null);
  const lastLoadedAudioUrlRef = useRef<string | null>(null);
  const [pdfUrlVersion, setPdfUrlVersion] = useState(0);
  const pdfPageRef = useRef(1);

  // When switching sessions, pause previous audio and initialize per-session state
  useEffect(() => {
    if (!activeSession) {
      resetAudio();
      audioLoadedSessionRef.current = null;
      lastLoadedAudioUrlRef.current = null;
      return;
    }

    const saved = getSessionPersistedState(activeSession.id);
    const initialPage = saved.pdfPage ?? activeSession.lastViewedPage ?? 1;
    const initialMode = saved.documentMode ?? activeSession.documentOrientation ?? "horizontal";

    pdfPageRef.current = initialPage;
    setMode(initialMode);
    lastLoadedAudioUrlRef.current = null;
    audioLoadedSessionRef.current = null;
    setPdfUrlVersion((v) => v + 1);

    // If the session has no audio attachment at all, reset player immediately
    if (!activeSession.audioFileId && !activeSession.audioUrl) {
      resetAudio();
    }
  }, [activeSession, resetAudio]);

  // Load audio for the active quarter once URLs are resolved
  useEffect(() => {
    if (!activeSession) return;

    if (audioUrls?.audio && lastLoadedAudioUrlRef.current !== audioUrls.audio) {
      const isNewSession = audioLoadedSessionRef.current !== activeSession.id;
      const saved = getSessionPersistedState(activeSession.id);
      const startAt = isNewSession
        ? (saved.audioTimestamp ?? activeSession.lastListenedTimestamp ?? 0)
        : (saved.audioTimestamp ?? 0);

      lastLoadedAudioUrlRef.current = audioUrls.audio;
      audioLoadedSessionRef.current = activeSession.id;
      urlLoadTimeRef.current = Date.now();
      load(audioUrls.audio, startAt, false);
    } else if (audioUrls && !audioUrls.audio) {
      // Quarter resolved with no audio
      resetAudio();
    }
  }, [activeSession, audioUrls, load, resetAudio]);

  const handleUrlFailure = useCallback(() => {
    void (async () => {
      await refreshUrls();
    })();
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

  const handlePdfPageChange = useCallback(
    (page: number) => {
      if (!activeSession) return;
      pdfPageRef.current = page;
      saveSessionPersistedState(activeSession.id, {
        pdfPage: page,
        documentMode: mode,
      });
    },
    [activeSession, mode]
  );

  // Sync currentTime to localStorage per-quarter while playing
  useEffect(() => {
    if (!activeSession) return;
    const sessionId = activeSession.id;
    const timer = setInterval(() => {
      if (audioTime >= 0) {
        saveSessionPersistedState(sessionId, {
          audioTimestamp: audioTime,
          pdfPage: pdfPageRef.current,
          documentMode: mode,
        });
      }
    }, 3_000);
    return () => clearInterval(timer);
  }, [activeSession, audioTime, mode]);

  // Write back progress to Notion on unload / interval
  useEffect(() => {
    const pageId = activeSession?.id;
    if (!pageId) return;

    const flush = () => {
      const state = getSessionPersistedState(pageId);
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

    const interval = setInterval(flush, 25_000);

    return () => {
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("pagehide", onPageHide);
      clearInterval(interval);
    };
  }, [activeSession?.id]);

  const handleModeToggle = useCallback(
    (next: DocumentMode) => {
      setMode(next);
      if (activeSession) {
        saveSessionPersistedState(activeSession.id, {
          documentMode: next,
          pdfPage: pdfPageRef.current,
        });
      }
    },
    [activeSession]
  );

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
                    ? "bg-sky-500/20 text-sky-400 font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
                title="Presentation (slide by slide)"
              >
                Presentation
              </button>
              <button
                onClick={() => handleModeToggle("vertical")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  mode === "vertical"
                    ? "bg-sky-500/20 text-sky-400 font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
                title="Document (continuous scroll)"
              >
                Document
              </button>
            </div>
          </div>

          <SplitWorkspace
            defaultSize={74}
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
                <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-zinc-500 bg-surface-950 p-6">
                  {audioUrls && !audioUrls.pdf ? (
                    <>
                      <svg className="h-10 w-10 text-surface-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <p>No presentation attached to this session.</p>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Spinner className="h-5 w-5" />
                      <span>Loading presentation…</span>
                    </div>
                  )}
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