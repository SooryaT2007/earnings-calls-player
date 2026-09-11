"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { DocumentMode } from "@/types";
import { Spinner } from "@/components/ui/primitives";
import { Document, Page, pdfjs } from "react-pdf";

// Configure pdfjs worker to matching version
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
}

export type PdfViewerHandle = {
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (p: number) => void;
  getCurrentPage: () => number | null;
};

type PdfViewerProps = {
  url: string;
  mode: DocumentMode;
  initialPage?: number;
  onPageChange?: (page: number) => void;
  onLoadError?: (err?: Error) => void;
};

const PDFJS_VERSION = "3.11.174";

function PdfViewerInner(
  { url, mode, initialPage, onPageChange, onLoadError }: PdfViewerProps,
  ref: React.ForwardedRef<PdfViewerHandle>
) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [page, setPage] = useState<number>(Math.max(1, initialPage ?? 1));
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(1);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [containerHeight, setContainerHeight] = useState<number>(600);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const failedRef = useRef(false);

  // Sync initialPage when session changes
  useEffect(() => {
    failedRef.current = false;
    setError(null);
    const targetPage = Math.max(1, initialPage ?? 1);
    setPage(targetPage);
  }, [url, initialPage]);

  // Measure container dimensions for responsive slide sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0) setContainerWidth(width);
        if (height > 0) setContainerHeight(height);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const goToPage = useCallback(
    (target: number) => {
      const clamped = numPages ? Math.max(1, Math.min(target, numPages)) : Math.max(1, target);
      setPage(clamped);
      onPageChange?.(clamped);

      if (mode === "vertical") {
        const pageEl = pageRefs.current.get(clamped);
        if (pageEl) {
          pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    },
    [numPages, onPageChange, mode]
  );

  const nextPage = useCallback(() => {
    setPage((prev) => {
      const next = numPages ? Math.min(prev + 1, numPages) : prev + 1;
      onPageChange?.(next);
      if (mode === "vertical") {
        const pageEl = pageRefs.current.get(next);
        pageEl?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return next;
    });
  }, [numPages, onPageChange, mode]);

  const prevPage = useCallback(() => {
    setPage((prev) => {
      const next = Math.max(prev - 1, 1);
      onPageChange?.(next);
      if (mode === "vertical") {
        const pageEl = pageRefs.current.get(next);
        pageEl?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return next;
    });
  }, [onPageChange, mode]);

  useImperativeHandle(ref, () => ({
    nextPage,
    prevPage,
    goToPage,
    getCurrentPage: () => page,
  }));

  // Scroll to top when page changes in horizontal mode
  useEffect(() => {
    if (mode === "horizontal" && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [page, mode]);

  // In vertical mode, observe visible pages to sync active page number as user scrolls
  useEffect(() => {
    if (mode !== "vertical" || !numPages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let maxRatio = 0;
        let visiblePage = page;
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            const pNum = Number(entry.target.getAttribute("data-page-number"));
            if (pNum) visiblePage = pNum;
          }
        }
        if (maxRatio > 0.3 && visiblePage !== page) {
          setPage(visiblePage);
          onPageChange?.(visiblePage);
        }
      },
      {
        root: containerRef.current,
        threshold: [0.1, 0.3, 0.6, 0.9],
      }
    );

    pageRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [mode, numPages, page, onPageChange]);

  const handleLoadError = useCallback(
    (err?: Error) => {
      if (failedRef.current) return;
      failedRef.current = true;
      console.error("PDF Load Error:", err);
      setError(err?.message || "The presentation failed to load.");
      onLoadError?.(err);
    },
    [onLoadError]
  );

  const zoomIn = () => setScale((s) => Math.min(s + 0.15, 2.5));
  const zoomOut = () => setScale((s) => Math.max(s - 0.15, 0.6));
  const resetZoom = () => setScale(1);

  // Use the same-origin PDF proxy route to avoid CORS, preflight OPTIONS, and worker restrictions
  const fileSource = useMemo(() => {
    if (!url) return null;
    const proxiedUrl = url.startsWith("http")
      ? `/api/pdf-proxy?url=${encodeURIComponent(url)}`
      : url;

    return {
      url: proxiedUrl,
      cMapUrl: `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/standard_fonts/`,
    };
  }, [url]);

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-surface-950 p-6 text-sm text-zinc-400">
        <svg
          className="h-10 w-10 text-amber-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="max-w-md text-center font-medium text-zinc-300">{error}</p>
        <button
          onClick={() => {
            failedRef.current = false;
            setError(null);
            onLoadError?.();
          }}
          className="mt-2 rounded-lg bg-surface-800 px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-surface-700"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  // Calculate optimum width for horizontal slide display
  const horizontalPageWidth = Math.max(300, Math.min(containerWidth - 64, (containerHeight - 100) * (16 / 9))) * scale;

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-surface-950">
      {mode === "horizontal" ? (
        <div
          ref={containerRef}
          className="flex h-full w-full items-center justify-center overflow-auto p-4"
        >
          <div className="relative my-auto flex flex-col items-center">
            {fileSource && (
              <Document
                file={fileSource}
                onLoadSuccess={({ numPages: total }) => {
                  setNumPages(total);
                  if (page > total) setPage(total);
                }}
                onLoadError={handleLoadError}
                loading={
                  <div className="flex h-80 w-full items-center justify-center">
                    <Spinner className="h-7 w-7" />
                  </div>
                }
                error={
                  <div className="py-12 text-center text-sm text-zinc-500">
                    Unable to display presentation.
                  </div>
                }
              >
                <Page
                  pageNumber={page}
                  width={horizontalPageWidth}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="overflow-hidden rounded-lg shadow-2xl shadow-black/70 ring-1 ring-white/10"
                  onLoadError={handleLoadError}
                />
              </Document>
            )}
          </div>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="h-full w-full overflow-y-auto p-6"
        >
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6">
            {fileSource && (
              <Document
                file={fileSource}
                onLoadSuccess={({ numPages: total }) => {
                  setNumPages(total);
                  if (page > total) setPage(total);
                }}
                onLoadError={handleLoadError}
                loading={
                  <div className="flex h-80 items-center justify-center">
                    <Spinner className="h-7 w-7" />
                  </div>
                }
                error={
                  <div className="py-12 text-center text-sm text-zinc-500">
                    Unable to display presentation document.
                  </div>
                }
              >
                {Array.from({ length: numPages ?? 0 }, (_, i) => i + 1).map((p) => (
                <div
                  key={p}
                  ref={(el) => {
                    if (el) pageRefs.current.set(p, el);
                    else pageRefs.current.delete(p);
                  }}
                  data-page-number={p}
                  className="w-full flex flex-col items-center mb-14 last:mb-8"
                >
                  <div className="flex items-center justify-between w-full max-w-[880px] px-3 mb-2 text-[11px] font-mono text-zinc-500">
                    <span className="rounded-full bg-surface-850 px-2 py-0.5 text-zinc-400">Page {p} of {numPages}</span>
                  </div>
                  <Page
                    pageNumber={p}
                    width={Math.min(containerWidth - 64, 880) * scale}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    onLoadError={handleLoadError}
                    className="overflow-hidden rounded-xl shadow-2xl shadow-black/80 ring-1 ring-white/10"
                  />
                </div>
              ))}
              </Document>
            )}

            <p className="py-4 text-xs text-zinc-500">
              {numPages ? `${numPages} pages total` : "Loading pages…"}
            </p>
          </div>
        </div>
      )}

      {/* Floating Presentation Controls Bar */}
      <div className="pointer-events-none absolute bottom-4 left-0 right-0 flex justify-center px-4">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-surface-700/80 bg-surface-900/90 px-3 py-1.5 shadow-2xl backdrop-blur-md">
          {/* Previous Slide Button */}
          <button
            onClick={prevPage}
            disabled={page <= 1}
            title="Previous slide (← / PageUp)"
            className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-surface-700 hover:text-white disabled:pointer-events-none disabled:opacity-30"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Page Counter & Jumper */}
          <div className="flex items-center gap-1 px-1.5 text-xs font-medium text-zinc-300">
            <span>Slide</span>
            <input
              type="number"
              min={1}
              max={numPages ?? 1}
              value={page}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) goToPage(val);
              }}
              aria-label="Current slide number"
              className="w-10 rounded bg-surface-800 px-1 py-0.5 text-center text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-accent-500"
            />
            <span className="text-zinc-500">/ {numPages ?? "…"}</span>
          </div>

          {/* Next Slide Button */}
          <button
            onClick={nextPage}
            disabled={numPages ? page >= numPages : false}
            title="Next slide (→ / PageDown)"
            className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-surface-700 hover:text-white disabled:pointer-events-none disabled:opacity-30"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="mx-1 h-3.5 w-px bg-surface-700" />

          {/* Zoom Controls */}
          <button
            onClick={zoomOut}
            title="Zoom out"
            className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:bg-surface-700 hover:text-zinc-200"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={resetZoom}
            title="Reset zoom"
            className="px-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-200"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={zoomIn}
            title="Zoom in"
            className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:bg-surface-700 hover:text-zinc-200"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export const PdfViewer = forwardRef<PdfViewerHandle, PdfViewerProps>(PdfViewerInner);
PdfViewer.displayName = "PdfViewer";