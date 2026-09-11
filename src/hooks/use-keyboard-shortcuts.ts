"use client";

import { useEffect } from "react";
import { PLAYBACK_SPEEDS, useAudioPlayer } from "@/components/providers/audio-player-provider";

export type KeyboardShortcutsOptions = {
  nextPage?: () => void;
  prevPage?: () => void;
  firstPage?: () => void;
  lastPage?: () => void;
  toggleDocumentMode?: () => void;
  onOpenUpload?: () => void;
  onOpenShortcuts?: () => void;
};

/**
 * Global Keyboard Shortcuts:
 *
 * --- Audio Playback (YouTube style) ---
 * - k / Space          : Toggle Play / Pause
 * - j                  : Rewind 10 seconds
 * - l                  : Fast-forward 10 seconds
 * - m                  : Toggle Mute / Unmute
 * - 0 - 9              : Seek to 0% - 90% of audio duration
 * - < or ,             : Decrease playback speed
 * - > or .             : Increase playback speed
 * - [                  : Rewind 30 seconds
 * - ]                  : Fast-forward 30 seconds
 *
 * --- PDF & Presentation Navigation ---
 * - ArrowUp / PageUp   : Previous Slide / Page
 * - ArrowDown / PageDown: Next Slide / Page
 * - ArrowLeft          : Previous Slide
 * - ArrowRight         : Next Slide
 * - Home               : First Slide / Page
 * - End                : Last Slide / Page
 * - d / D              : Toggle Presentation / Document Mode
 *
 * --- Application Actions ---
 * - u / U              : Open Upload Modal
 * - ? / Shift + /      : Open Shortcuts Cheatsheet
 */
export function useKeyboardShortcuts({
  nextPage,
  prevPage,
  firstPage,
  lastPage,
  toggleDocumentMode,
  onOpenUpload,
  onOpenShortcuts,
}: KeyboardShortcutsOptions): void {
  const {
    toggle,
    seek,
    seekBy,
    setSpeed,
    speed,
    volume,
    setVolume,
    duration,
  } = useAudioPlayer();

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
      const ctrl = event.ctrlKey || event.metaKey;

      // Handle number keys 0-9 for YouTube-style seeking
      if (!ctrl && !shift && key >= "0" && key <= "9" && duration > 0) {
        event.preventDefault();
        const percent = parseInt(key, 10) / 10;
        seek(percent * duration);
        return;
      }

      switch (key) {
        // Play / Pause
        case "k":
        case "K":
        case " ":
          event.preventDefault();
          toggle();
          break;

        // J / L YouTube Seek
        case "j":
        case "J":
          event.preventDefault();
          seekBy(-10);
          break;
        case "l":
        case "L":
          event.preventDefault();
          seekBy(10);
          break;

        // Mute / Unmute
        case "m":
        case "M":
          event.preventDefault();
          setVolume(volume <= 0 ? 0.8 : 0);
          break;

        // Speed Controls
        case ">":
        case ".":
          event.preventDefault();
          {
            const idx = PLAYBACK_SPEEDS.indexOf(speed);
            const next = PLAYBACK_SPEEDS[Math.min(idx + 1, PLAYBACK_SPEEDS.length - 1)];
            if (next !== undefined) setSpeed(next);
          }
          break;
        case "<":
        case ",":
          event.preventDefault();
          {
            const idx = PLAYBACK_SPEEDS.indexOf(speed);
            const prev = PLAYBACK_SPEEDS[Math.max(idx - 1, 0)];
            if (prev !== undefined) setSpeed(prev);
          }
          break;

        // 30s Jumps
        case "[":
          event.preventDefault();
          seekBy(-30);
          break;
        case "]":
          event.preventDefault();
          seekBy(30);
          break;

        // PDF Movement - Up / Down / Left / Right
        case "ArrowUp":
        case "PageUp":
          event.preventDefault();
          prevPage?.();
          break;
        case "ArrowDown":
        case "PageDown":
          event.preventDefault();
          nextPage?.();
          break;
        case "ArrowLeft":
          event.preventDefault();
          prevPage?.();
          break;
        case "ArrowRight":
          event.preventDefault();
          nextPage?.();
          break;
        case "Home":
          event.preventDefault();
          firstPage?.();
          break;
        case "End":
          event.preventDefault();
          lastPage?.();
          break;

        // Mode Toggle
        case "d":
        case "D":
          if (!ctrl) {
            event.preventDefault();
            toggleDocumentMode?.();
          }
          break;

        // Open Upload Modal
        case "u":
        case "U":
          if (!ctrl) {
            event.preventDefault();
            onOpenUpload?.();
          }
          break;

        // Open Shortcuts Cheatsheet
        case "?":
          event.preventDefault();
          onOpenShortcuts?.();
          break;
        case "/":
          if (shift) {
            event.preventDefault();
            onOpenShortcuts?.();
          }
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    toggle,
    seek,
    seekBy,
    setSpeed,
    speed,
    volume,
    setVolume,
    duration,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    toggleDocumentMode,
    onOpenUpload,
    onOpenShortcuts,
  ]);
}