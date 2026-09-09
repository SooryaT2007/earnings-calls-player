"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { DocumentMode } from "@/types";
import { Spinner } from "@/components/ui/primitives";

import { Document, Page, pdfjs } from "react-pdf";

// Configure the pdf.js worker as a static asset in /public. Serving it this
// way (rather than bundling via webpack) avoids parser issues with the
// worker's .mjs format in Next.js.
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

export type PdfViewerHandle = {
  nextPage: () => void;
  prevPage: () => void;
  getCurrentPage: () => number | null;
};

type PdfViewerProps = {
  url: string;
  mode: DocumentMode;
  initialPage?: number;
  onPageChange?: (page: number) => void;
  onLoadError?: () => void;
};

function PdfViewerInner(
  { url, mode, initialPage, onPageChange, onLoadError }: PdfViewerProps,
  ref: React.ForwardedRef<PdfViewerHandle>
) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [page, setPage] = useState<number>(Math.max(1, initialPage ?? 1));
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const failedRef = useRef(false);

  useEffect(() => {
    failedRef.current = false;
    setError(null);
    setPage(Math.max(1, initialPage ?? 1));
    setNumPages(null);
  }, [url, initialPage]);

  const nextPage = useCallback(() => {
    setPage((prev) => {
      const next = numPages ? Math.min(prev + 1, numPages) : prev + 1;
      onPageChange?.(next);
      return next;
    });
  }, [numPages, onPageChange]);

  const prevPage = useCallback(() => {
    setPage((prev) => {
      const next = Math.max(prev - 1, 1);
      onPageChange?.(next);
      return next;
    });
  }, [onPageChange]);

  useImperativeHandle(ref, () => ({
    nextPage,
    prevPage,
    getCurrentPage: () => page,
  }));

  // In horizontal (presentation) mode, scroll the container to the top of the
  // current page when it changes.
  useEffect(() => {
    if (mode === "horizontal" && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [page, mode]);

  const handleLoadError = useCallback(() => {
    if (failedRef.current) return;
    failedRef.current = true;
    setError("The presentation link expired. Refreshing…");
    // Notion URLs expire after 60 minutes; ask the parent to fetch a fresh one.
    onLoadError?.();
  }, [onLoadError]);

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-zinc-400">
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
        <p>{error}</p>
      </div>
    );
  }

  if (mode === "horizontal") {
    return (
      <div
        ref={containerRef}
        className="flex h-full w-full items-center justify-center overflow-y-auto bg-surface-950"
      >
        <div className="relative mx-auto my-auto min-w-0 max-w-5xl px-6 py-4">
          <Document
            file={url}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={handleLoadError}
            loading={
              <div className="flex h-64 items-center justify-center">
                <Spinner className="h-6 w-6" />
              </div>
            }
            error={
              <div className="py-6 text-sm text-zinc-500">
                Unable to load this PDF.
              </div>
            }
          >
            <Page
              pageNumber={page}
              width={undefined}
              scale={1}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="shadow-2xl shadow-black/60 ring-1 ring-surface-800"
              onLoadError={handleLoadError}
            />
          </Document>

          <div className="pointer-events-none sticky bottom-3 mt-3 flex w-full items-center justify-center">
            <span className="pointer-events-auto rounded-full bg-surface-800/90 px-3 py-1 text-xs text-zinc-300 backdrop-blur">
              {numPages ? `${page} / ${numPages}` : `Page ${page}`}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Vertical document mode: render all pages stacked, tracking the page in view.
  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-y-auto bg-surface-950"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 px-4 py-6">
        <Document
          file={url}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={handleLoadError}
          loading={
            <div className="flex h-64 items-center justify-center">
              <Spinner className="h-6 w-6" />
            </div>
          }
        >
          {Array.from({ length: numPages ?? 0 }, (_, i) => i + 1).map((p) => (
            <Page
              key={p}
              pageNumber={p}
              width={undefined}
              scale={1.1}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              onLoadError={handleLoadError}
              className="mb-4 shadow-xl shadow-black/50 ring-1 ring-surface-800"
            />
          ))}
        </Document>

        <p className="pb-4 text-xs text-zinc-500">
          {numPages ? `${numPages} pages` : "Loading…"}
        </p>
      </div>
    </div>
  );
}

type PdfViewerPropsWithHandle = PdfViewerProps;

// Export a forwardRef wrapper so callers can drive navigation.
export const PdfViewer = forwardRef<PdfViewerHandle, PdfViewerPropsWithHandle>(
  PdfViewerInner
);

PdfViewer.displayName = "PdfViewer";

export type { PdfViewerPropsWithHandle as PdfViewerProps };