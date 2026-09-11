import type { DocumentMode, PlaybackSpeed } from "@/types";

export type SessionPlaybackState = {
  audioTimestamp?: number;
  pdfPage?: number;
  documentMode?: DocumentMode;
};

export type PersistedState = {
  companyId?: string;
  sessionId?: string;
  playbackSpeed?: PlaybackSpeed;
  sessions?: Record<string, SessionPlaybackState>;
  // Legacy fields for backward compatibility
  audioTimestamp?: number;
  pdfPage?: number;
  documentMode?: DocumentMode;
};

const STORAGE_KEY = "earnings-calls-player:v2";

export function loadPersistedState(): PersistedState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as PersistedState;
    }
    // Try migrating from v1
    const v1Raw = window.localStorage.getItem("earnings-calls-player:v1");
    if (v1Raw) {
      const v1 = JSON.parse(v1Raw) as PersistedState;
      const initialSessions: Record<string, SessionPlaybackState> = {};
      if (v1.sessionId) {
        initialSessions[v1.sessionId] = {
          audioTimestamp: v1.audioTimestamp,
          pdfPage: v1.pdfPage,
          documentMode: v1.documentMode,
        };
      }
      const migrated: PersistedState = {
        companyId: v1.companyId,
        sessionId: v1.sessionId,
        playbackSpeed: v1.playbackSpeed,
        sessions: initialSessions,
      };
      savePersistedState(migrated);
      return migrated;
    }
    return {};
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

export function getSessionPersistedState(sessionId: string): SessionPlaybackState {
  const state = loadPersistedState();
  return state.sessions?.[sessionId] ?? {};
}

export function saveSessionPersistedState(
  sessionId: string,
  sessionState: Partial<SessionPlaybackState>
): void {
  if (!sessionId) return;
  const state = loadPersistedState();
  const sessions = { ...(state.sessions ?? {}) };
  sessions[sessionId] = {
    ...sessions[sessionId],
    ...sessionState,
  };
  savePersistedState({
    ...state,
    sessionId,
    sessions,
  });
}

export function clearPersistedAudio(sessionId?: string): void {
  if (typeof window === "undefined") return;
  if (sessionId) {
    saveSessionPersistedState(sessionId, { audioTimestamp: 0 });
  } else {
    const state = loadPersistedState();
    savePersistedState({ ...state, audioTimestamp: undefined });
  }
}

export function useMediaQuery(query: string): boolean | undefined {
  if (typeof window === "undefined") return undefined;
  return window.matchMedia(query).matches;
}