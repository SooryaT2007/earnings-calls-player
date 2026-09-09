"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppState } from "@/components/providers/app-provider";
import { parseFilename } from "@/lib/filename-parser";
import { cn, formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/primitives";

type SlotFile = {
  file: File;
  size: number;
};

const ACCEPTED_AUDIO =
  "audio/mpeg,audio/wav,audio/mp4,audio/aac,audio/flac,audio/ogg,audio/webm,audio/x-m4a,.mp3,.wav,.m4a,.aac,.flac,.ogg,.oga,.webm";

export function UploadModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { activeCompany, refreshSessions } = useAppState();

  const [pdfFile, setPdfFile] = useState<SlotFile | null>(null);
  const [audioFile, setAudioFile] = useState<SlotFile | null>(null);
  const [period, setPeriod] = useState("");
  const [title, setTitle] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = useCallback(() => {
    setPdfFile(null);
    setAudioFile(null);
    setPeriod("");
    setTitle("");
    setError(null);
    setSuccess(false);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const handleFiles = useCallback((files: File[]) => {
    for (const file of files) {
      const parsed = parseFilename(file.name);
      if (parsed.period) setPeriod((prev) => prev || parsed.period!);

      if (parsed.kind === "pdf") {
        setPdfFile({ file, size: file.size });
      } else if (parsed.kind === "audio") {
        setAudioFile({ file, size: file.size });
      } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        setPdfFile({ file, size: file.size });
      } else if (file.type.startsWith("audio/")) {
        setAudioFile({ file, size: file.size });
      } else {
        // Heuristic: try to place by extension.
        const lower = file.name.toLowerCase();
        if (lower.endsWith(".mp3") || lower.endsWith(".wav") || lower.endsWith(".m4a")) {
          setAudioFile({ file, size: file.size });
        } else {
          setError(`Unsupported file type: ${file.name}`);
        }
      }
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files) {
        handleFiles(Array.from(e.dataTransfer.files));
      }
    },
    [handleFiles]
  );

  const handleUpload = useCallback(async () => {
    if (!activeCompany) return;
    if (!period.trim()) {
      setError("Period is required. e.g. Q1FY27");
      return;
    }
    if (!pdfFile && !audioFile) {
      setError("Add at least a PDF or an audio file.");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.append("companyId", activeCompany.id);
    formData.append("period", period.trim().toUpperCase());
    if (title.trim()) formData.append("title", title.trim());
    if (pdfFile) formData.append("pdf", pdfFile.file);
    if (audioFile) formData.append("audio", audioFile.file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const body = (await res.json()) as { error?: string; pageId?: string };

      if (!res.ok) {
        throw new Error(body.error ?? "Upload failed");
      }

      await refreshSessions();
      setSuccess(true);
      setTimeout(() => onClose(), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [activeCompany, period, title, pdfFile, audioFile, onClose, refreshSessions]);

  if (!open) return null;

  const periodPlaceholder = activeCompany
    ? `${activeCompany.name} Q1FY27`
    : "Select a company first";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fade-in-full"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-surface-700 bg-surface-900 p-6 shadow-2xl animate-fade-in">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">
              Upload New Session
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              {activeCompany
                ? `Uploading to ${activeCompany.name}`
                : "Select a company in the top bar first."}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-surface-800 hover:text-zinc-200"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            Session created successfully.
          </div>
        )}

        <div
          className={cn(
            "rounded-xl border-2 border-dashed p-6 text-center transition-colors",
            dragging
              ? "border-accent-500 bg-accent-500/10"
              : "border-surface-600 bg-surface-850 hover:border-surface-500"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <svg
            className="mx-auto mb-3 h-10 w-10 text-zinc-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 16V4m0 0l-4 4m4-4l4 4" />
            <path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
          </svg>
          <p className="text-sm text-zinc-300">
            Drop your PDF and audio files here, or browse
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => document.getElementById("pdf-upload-input")?.click()}
            >
              Add PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => document.getElementById("audio-upload-input")?.click()}
            >
              Add Audio
            </Button>
          </div>

          <input
            id="pdf-upload-input"
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              if (files.length) handleFiles(files);
              e.target.value = "";
            }}
          />
          <input
            id="audio-upload-input"
            type="file"
            accept={ACCEPTED_AUDIO}
            className="hidden"
            onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              if (files.length) handleFiles(files);
              e.target.value = "";
            }}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <FileSlotCard
            label="Presentation PDF"
            slot={pdfFile}
            onClear={() => setPdfFile(null)}
          />
          <FileSlotCard
            label="Audio Recording"
            slot={audioFile}
            onClear={() => setAudioFile(null)}
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-400">
              Period <span className="text-accent-400">*</span>
            </span>
            <input
              type="text"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder={periodPlaceholder}
              className="w-full rounded-lg border border-surface-600 bg-surface-850 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-400">
              Title
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Q1FY27 Earnings Call"
              className="w-full rounded-lg border border-surface-600 bg-surface-850 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent-500 focus:outline-none"
            />
          </label>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-600">
            Files up to ~100MB are uploaded to Notion.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={uploading}>
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={handleUpload}
              disabled={uploading || !activeCompany}
            >
              {uploading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Uploading…
                </>
              ) : (
                "Upload Session"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FileSlotCard({
  label,
  slot,
  onClear,
}: {
  label: string;
  slot: SlotFile | null;
  onClear: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border px-3 py-2.5",
        slot
          ? "border-accent-500/40 bg-accent-500/5"
          : "border-surface-700 bg-surface-850"
      )}
    >
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </p>
        {slot ? (
          <>
            <p className="truncate text-sm text-zinc-200">{slot.file.name}</p>
            <p className="text-xs text-zinc-500">{formatBytes(slot.size)}</p>
          </>
        ) : (
          <p className="text-sm text-zinc-600">None attached</p>
        )}
      </div>
      {slot && (
        <button
          onClick={onClear}
          aria-label="Remove file"
          className="ml-2 rounded p-1 text-zinc-500 hover:bg-surface-700 hover:text-zinc-200"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}