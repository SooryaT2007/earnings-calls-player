import type { DocumentMode, PlaybackSpeed } from "@/types";

export type PersistedState = {
  companyId?: string;
  sessionId?: string;
  audioTimestamp?: number;
  audioPlaying?: boolean;
  pdfPage?: number;
  documentMode?: DocumentMode;
  playbackSpeed?: PlaybackSpeed;
};

const STORAGE_KEY = "earnings-calls-player:v1";

export function loadPersistedState(): PersistedState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PersistedState;
  } catch {
    return {};
  }
}

export function savePersistedState(state: PersistedState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be full or blocked; fail silently.
  }
}

export function clearPersistedAudio(): void {
  if (typeof window === "undefined") return;
  const state = loadPersistedState();
  savePersistedState({ ...state, audioTimestamp: undefined });
}

export function useMediaQuery(query: string): boolean | undefined {
  if (typeof window === "undefined") return undefined;
  return window.matchMedia(query).matches;
}