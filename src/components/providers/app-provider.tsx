"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Company, Session } from "@/types";
import { loadPersistedState, savePersistedState } from "@/hooks/use-persisted-state";
import { AudioPlayerProvider } from "./audio-player-provider";

type AppState = {
  companies: Company[];
  filteredCompanies: Company[];
  loading: boolean;
  error: string | null;

  sectors: string[];
  activeSector: string;
  setActiveSector: (s: string) => void;

  activeCompany: Company | null;
  setActiveCompany: (c: Company | null) => void;

  sessions: Session[];
  sessionsLoading: boolean;
  activeSession: Session | null;
  setActiveSession: (s: Session | null) => void;

  audioUrls: { audio: string | null; pdf: string | null } | null;
  refreshUrls: () => Promise<{
    audio: string | null;
    pdf: string | null;
  } | null>;
  refreshSessions: (selectSessionId?: string) => Promise<Session[]>;
};

const AppStateContext = createContext<AppState | null>(null);

function fetchCompaniesFn(): Promise<Company[]> {
  return fetch("/api/companies", { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error("Failed to load companies");
    return r.json() as Promise<Company[]>;
  });
}

function fetchSessionsFn(companyId: string): Promise<Session[]> {
  return fetch(`/api/sessions?companyId=${encodeURIComponent(companyId)}`, {
    cache: "no-store",
  }).then((r) => {
    if (!r.ok) throw new Error("Failed to load sessions");
    return r.json() as Promise<Session[]>;
  });
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const persisted = useMemo(() => loadPersistedState(), []);

  const [activeSector, setActiveSectorState] = useState<string>(
    () => persisted.sector || "All"
  );
  const [activeCompany, setActiveCompanyState] = useState<Company | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [activeSession, setActiveSessionState] = useState<Session | null>(null);
  const [audioUrls, setAudioUrls] = useState<{
    audio: string | null;
    pdf: string | null;
  } | null>(null);

  const sessionsAbortRef = useRef<AbortController | null>(null);

  // Derive unique sectors across all loaded companies
  const sectors = useMemo(() => {
    const set = new Set<string>();
    for (const c of companies) {
      if (Array.isArray(c.sectors)) {
        for (const s of c.sectors) {
          if (s) set.add(s);
        }
      }
    }
    return ["All", ...Array.from(set)];
  }, [companies]);

  // Companies filtered by currently selected sector
  const filteredCompanies = useMemo(() => {
    if (activeSector === "All") return companies;
    return companies.filter((c) => c.sectors?.includes(activeSector));
  }, [companies, activeSector]);

  // Load companies once on mount
  useEffect(() => {
    let cancelled = false;
    fetchCompaniesFn()
      .then((list) => {
        if (cancelled) return;
        setCompanies(list);
        if (list.length > 0) {
          const savedId = persisted.companyId;
          const match = list.find((c) => c.id === savedId) ?? list[0];
          setActiveCompanyState(match);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [persisted.companyId]);

  const setActiveSector = useCallback(
    (sector: string) => {
      setActiveSectorState(sector);
      savePersistedState({ ...loadPersistedState(), sector });

      // If activeCompany is not in the new sector, switch to first company in sector
      if (sector !== "All") {
        const inSector = companies.filter((c) => c.sectors?.includes(sector));
        if (inSector.length > 0 && (!activeCompany || !activeCompany.sectors?.includes(sector))) {
          setActiveCompanyState(inSector[0]);
          setActiveSessionState(null);
          setSessions([]);
          setAudioUrls(null);
          savePersistedState({
            ...loadPersistedState(),
            sector,
            companyId: inSector[0].id,
          });
        }
      }
    },
    [companies, activeCompany]
  );

  const setActiveCompany = useCallback((company: Company | null) => {
    setActiveCompanyState(company);
    setActiveSessionState(null);
    setSessions([]);
    setAudioUrls(null);
    savePersistedState({ ...loadPersistedState(), companyId: company?.id });
  }, []);

  // Fetch sessions for the active company.
  useEffect(() => {
    if (!activeCompany) {
      setSessions([]);
      setSessionsLoading(false);
      return;
    }
    sessionsAbortRef.current?.abort();
    const controller = new AbortController();
    sessionsAbortRef.current = controller;
    setSessionsLoading(true);

    fetchSessionsFn(activeCompany.id)
      .then((list) => {
        if (controller.signal.aborted) return;
        setSessions(list);
        const savedId = persisted.sessionId;
        const match = list.find((s) => s.id === savedId) ?? list[0] ?? null;
        setActiveSessionState(match);
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : String(e));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setSessionsLoading(false);
      });
    return () => controller.abort();
  }, [activeCompany, persisted.sessionId]);

  const setActiveSession = useCallback((session: Session | null) => {
    setActiveSessionState(session);
    setAudioUrls(null);
    savePersistedState({ ...loadPersistedState(), sessionId: session?.id });
  }, []);

  const refreshUrls = useCallback(async () => {
    if (!activeSession) return null;
    try {
      const res = await fetch(
        `/api/session-urls?pageId=${encodeURIComponent(activeSession.id)}`
      );
      if (!res.ok) throw new Error("Failed to refresh file URLs");
      const data = (await res.json()) as {
        audioUrl: string | null;
        pdfUrl: string | null;
      };
      const urls = { audio: data.audioUrl ?? null, pdf: data.pdfUrl ?? null };
      setAudioUrls(urls);
      return urls;
    } catch {
      setAudioUrls({ audio: null, pdf: null });
      return null;
    }
  }, [activeSession]);

  // Load fresh URLs when a session is selected.
  useEffect(() => {
    if (!activeSession) {
      setAudioUrls(null);
      return;
    }
    void refreshUrls();
  }, [activeSession, refreshUrls]);

  const handleNeedUrlRefresh = useCallback(() => {
    void refreshUrls();
  }, [refreshUrls]);

  const refreshSessions = useCallback(
    async (selectSessionId?: string): Promise<Session[]> => {
      if (!activeCompany) return [];
      try {
        const list = await fetchSessionsFn(activeCompany.id);
        setSessions(list);
        if (selectSessionId) {
          const target = list.find((s) => s.id === selectSessionId);
          if (target) {
            setActiveSessionState(target);
            setAudioUrls(null);
            savePersistedState({
              ...loadPersistedState(),
              sessionId: target.id,
            });
          }
        }
        return list;
      } catch (err) {
        console.error("Failed to refresh sessions:", err);
        return [];
      }
    },
    [activeCompany]
  );

  const value = useMemo<AppState>(
    () => ({
      companies,
      filteredCompanies,
      loading,
      error,
      sectors,
      activeSector,
      setActiveSector,
      activeCompany,
      setActiveCompany,
      sessions,
      sessionsLoading,
      activeSession,
      setActiveSession,
      audioUrls,
      refreshUrls,
      refreshSessions,
    }),
    [
      companies,
      filteredCompanies,
      loading,
      error,
      sectors,
      activeSector,
      setActiveSector,
      activeCompany,
      setActiveCompany,
      sessions,
      sessionsLoading,
      activeSession,
      setActiveSession,
      audioUrls,
      refreshUrls,
      refreshSessions,
    ]
  );

  return (
    <AppStateContext.Provider value={value}>
      <AudioPlayerProvider onNeedUrlRefresh={handleNeedUrlRefresh}>
        {children}
      </AudioPlayerProvider>
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppProvider");
  return ctx;
}