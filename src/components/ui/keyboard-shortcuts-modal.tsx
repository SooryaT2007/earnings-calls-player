"use client";

import { useEffect } from "react";
import { IconButton } from "@/components/ui/primitives";

type ShortcutGroup = {
  title: string;
  icon: React.ReactNode;
  shortcuts: Array<{ keys: string[]; description: string }>;
};

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Audio Playback (YouTube style)",
    icon: (
      <svg className="h-4 w-4 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    ),
    shortcuts: [
      { keys: ["Space", "K"], description: "Toggle Play / Pause" },
      { keys: ["J"], description: "Rewind 10 seconds" },
      { keys: ["L"], description: "Fast-forward 10 seconds" },
      { keys: ["[", "]"], description: "Rewind / Forward 30 seconds" },
      { keys: ["0", "–", "9"], description: "Seek to 0% – 90% position" },
      { keys: ["M"], description: "Mute / Unmute audio" },
      { keys: ["<", ">"], description: "Decrease / Increase playback speed" },
    ],
  },
  {
    title: "Presentation & PDF Controls",
    icon: (
      <svg className="h-4 w-4 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    shortcuts: [
      { keys: ["↑", "PgUp"], description: "Previous Slide / Page" },
      { keys: ["↓", "PgDn"], description: "Next Slide / Page" },
      { keys: ["←", "→"], description: "Slide Navigation" },
      { keys: ["Home", "End"], description: "First / Last Slide" },
      { keys: ["D"], description: "Toggle Presentation / Document Mode" },
    ],
  },
  {
    title: "Application Actions",
    icon: (
      <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    shortcuts: [
      { keys: ["U"], description: "Open Upload Modal (Audio & PDF)" },
      { keys: ["?"], description: "Open Keyboard Shortcuts Cheatsheet" },
      { keys: ["Esc"], description: "Close Modals and Overlays" },
    ],
  },
];

export function KeyboardShortcutsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-surface-700 bg-surface-900 p-6 shadow-2xl ring-1 ring-white/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M6 16h12" strokeLinecap="round" strokeWidth="2.5" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Keyboard Shortcuts</h2>
              <p className="text-xs text-zinc-400">Power user shortcuts for audio and presentation controls</p>
            </div>
          </div>
          <IconButton onClick={onClose} title="Close (Esc)">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </IconButton>
        </div>

        {/* Shortcuts Groups Grid */}
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 max-h-[70vh] overflow-y-auto pr-1">
          {SHORTCUT_GROUPS.map((group, idx) => (
            <div
              key={group.title}
              className={`rounded-xl border border-surface-800 bg-surface-950/70 p-4 ${
                idx === 0 ? "md:col-span-2" : ""
              }`}
            >
              <div className="flex items-center gap-2 pb-3 border-b border-surface-800/80 mb-3">
                {group.icon}
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                  {group.title}
                </h3>
              </div>
              <div className={`grid gap-2 text-xs ${idx === 0 ? "sm:grid-cols-2 sm:gap-x-6" : ""}`}>
                {group.shortcuts.map((s) => (
                  <div key={s.description} className="flex items-center justify-between py-1">
                    <span className="text-zinc-400">{s.description}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k) => (
                        <kbd
                          key={k}
                          className="min-w-[24px] rounded-md border border-surface-700 bg-surface-850 px-1.5 py-0.5 text-center font-mono text-[11px] font-semibold text-zinc-200 shadow-sm"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between border-t border-surface-800 pt-3 text-xs text-zinc-500">
          <span>Press <kbd className="rounded bg-surface-800 px-1.5 py-0.5 text-zinc-300 font-mono">?</kbd> anywhere to toggle this guide</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-surface-800 px-4 py-1.5 font-medium text-zinc-200 hover:bg-surface-700"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
