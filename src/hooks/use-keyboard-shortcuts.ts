"use client";

import { useEffect } from "react";
import { PLAYBACK_SPEEDS, useAudioPlayer } from "@/components/providers/audio-player-provider";

export type PdfNavigationControls = {
  nextPage: () => void;
  prevPage: () => void;
};

/**
 * Global keyboard shortcuts:
 *  - k / Space       toggle play/pause
 *  - j / l           rewind / forward 10s
 *  - Shift+>/Shift+< cycle playback speed
 *  - ArrowRight/PageDown  next page
 *  - ArrowLeft/PageUp      previous page
 *
 * Shortcuts are suppressed while typing in inputs, textareas, or selects.
 */
export function useKeyboardShortcuts(pdfControls: PdfNavigationControls): void {
  const { toggle, seekBy, setSpeed, speed } = useAudioPlayer();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable
      ) {
        return;
      }

      const key = event.key;
      const shift = event.shiftKey;

      switch (key) {
        case "k":
        case "K":
        case " ":
          event.preventDefault();
          toggle();
          break;

        case "j":
          event.preventDefault();
          seekBy(-10);
          break;
        case "l":
          event.preventDefault();
          seekBy(10);
          break;

        case ">":
        case ".":
          if (shift) {
            event.preventDefault();
            const idx = PLAYBACK_SPEEDS.indexOf(speed);
            const next = PLAYBACK_SPEEDS[Math.min(idx + 1, PLAYBACK_SPEEDS.length - 1)];
            if (next !== undefined) setSpeed(next);
          }
          break;
        case "<":
        case ",":
          if (shift) {
            event.preventDefault();
            const idx = PLAYBACK_SPEEDS.indexOf(speed);
            const prev = PLAYBACK_SPEEDS[Math.max(idx - 1, 0)];
            if (prev !== undefined) setSpeed(prev);
          }
          break;

        case "ArrowRight":
        case "PageDown":
          event.preventDefault();
          pdfControls.nextPage();
          break;
        case "ArrowLeft":
        case "PageUp":
          event.preventDefault();
          pdfControls.prevPage();
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle, seekBy, setSpeed, speed, pdfControls]);
}