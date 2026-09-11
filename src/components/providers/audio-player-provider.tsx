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
import type { PlaybackSpeed } from "@/types";

export type AudioStatus = "idle" | "loading" | "ready" | "playing" | "paused" | "error";

export type AudioController = {
  status: AudioStatus;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  speed: PlaybackSpeed;
  src: string | null;
  analyser: AnalyserNode | null;
  load: (url: string, startAt?: number, autoPlay?: boolean) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  reset: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  seekBy: (deltaSeconds: number) => void;
  setVolume: (v: number) => void;
  setSpeed: (s: PlaybackSpeed) => void;
  setSrc: (url: string) => void;
};

const AudioPlayerContext = createContext<AudioController | null>(null);

export const PLAYBACK_SPEEDS: PlaybackSpeed[] = [1, 1.25, 1.5, 1.75, 2];

export function AudioPlayerProvider({
  children,
  onNeedUrlRefresh,
}: {
  children: React.ReactNode;
  onNeedUrlRefresh?: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const refreshHandler = useRef(onNeedUrlRefresh);
  refreshHandler.current = onNeedUrlRefresh;

  const [status, setStatus] = useState<AudioStatus>("idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [speed, setSpeedState] = useState<PlaybackSpeed>(1);
  const [src, setSrcState] = useState<string | null>(null);

  const ensureElement = useCallback((): HTMLAudioElement | null => {
    if (!audioRef.current && typeof window !== "undefined") {
      const audio = new Audio();
      audio.preload = "auto";
      audio.volume = volume;
      // Set crossOrigin so that Vercel Blob audio is not silenced by Web Audio API
      audio.crossOrigin = "anonymous";
      audioRef.current = audio;

      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx && !audioCtxRef.current) {
          const ctx = new AudioCtx();
          audioCtxRef.current = ctx;
          if (!mediaSourceRef.current) {
            const source = ctx.createMediaElementSource(audio);
            mediaSourceRef.current = source;
            const vsAnalyser = ctx.createAnalyser();
            vsAnalyser.fftSize = 256;
            vsAnalyser.smoothingTimeConstant = 0.8;
            source.connect(vsAnalyser);
            vsAnalyser.connect(ctx.destination);
            setAnalyser(vsAnalyser);
          }
        }
      } catch (err) {
        // Fallback gracefully without Web Audio Analyser if browser restrictions block it
        console.warn("AudioContext setup warning (playback continues directly):", err);
        setAnalyser(null);
      }

      audio.addEventListener("timeupdate", () => {
        if (!isNaN(audio.currentTime)) {
          setCurrentTime(audio.currentTime);
        }
      });
      audio.addEventListener("loadedmetadata", () => {
        if (!isNaN(audio.duration)) {
          setDuration(audio.duration);
        }
      });
      audio.addEventListener("durationchange", () => {
        if (!isNaN(audio.duration)) {
          setDuration(audio.duration);
        }
      });
      audio.addEventListener("play", () => setStatus("playing"));
      audio.addEventListener("playing", () => setStatus("playing"));
      audio.addEventListener("pause", () => {
        if (audio.currentTime >= (audio.duration || 0) && audio.duration > 0) {
          setStatus("paused");
        } else {
          setStatus("paused");
        }
      });
      audio.addEventListener("ended", () => {
        setStatus("paused");
      });
      audio.addEventListener("waiting", () => setStatus("loading"));
      audio.addEventListener("canplay", () => {
        setStatus((s) => (s === "playing" ? "playing" : "ready"));
      });

      audio.addEventListener("error", (e) => {
        const statusCode = (e as unknown as { currentTarget?: { error?: { code?: number } } })
          ?.currentTarget?.error?.code;

        const el = audioRef.current;
        const networkState = el ? (el as unknown as { networkState?: number }).networkState : 0;
        if (networkState === 3 && (statusCode === 2 || statusCode === 4)) {
          setStatus("error");
          refreshHandler.current?.();
        } else {
          setStatus("error");
        }
      });
    }
    return audioRef.current;
  }, [volume]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
        audioRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        void audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  const load = useCallback(
    (url: string, startAt?: number, autoPlay: boolean = false) => {
      const audio = ensureElement();
      if (!audio) return;

      audio.pause();
      setSrcState(url);
      setStatus("loading");
      setCurrentTime(startAt || 0);

      audio.src = url;
      audio.playbackRate = speed;
      audio.volume = volume;
      audio.load();

      const applyStart = () => {
        if (typeof startAt === "number" && Number.isFinite(startAt) && startAt > 0) {
          try {
            audio.currentTime = startAt;
          } catch {
            // Seeker fallback
          }
        }
        if (autoPlay) {
          const ctx = audioCtxRef.current;
          if (ctx && ctx.state === "suspended") void ctx.resume();
          void audio.play().catch(() => setStatus("paused"));
        } else {
          setStatus("ready");
        }
      };

      audio.addEventListener("canplay", applyStart, { once: true });
    },
    [ensureElement, speed, volume]
  );

  const setSrc = useCallback(
    (url: string) => {
      setSrcState(url);
      const audio = ensureElement();
      if (audio) {
        audio.src = url;
        audio.load();
      }
    },
    [ensureElement]
  );

  const play = useCallback(() => {
    const audio = ensureElement();
    if (!audio) return;
    const ctx = audioCtxRef.current;
    if (ctx && ctx.state === "suspended") {
      void ctx.resume();
    }
    void audio.play().catch((e) => {
      console.warn("Audio play error:", e);
      setStatus("paused");
    });
  }, [ensureElement]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setStatus("paused");
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      setStatus("paused");
    }
  }, []);

  const reset = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }
    setSrcState(null);
    setStatus("idle");
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const toggle = useCallback(() => {
    if (status === "playing" || (audioRef.current && !audioRef.current.paused)) {
      pause();
    } else {
      play();
    }
  }, [status, play, pause]);

  const seek = useCallback(
    (time: number) => {
      const audio = audioRef.current;
      if (!audio || !Number.isFinite(time)) return;
      const target = Math.max(0, Math.min(time, audio.duration || time));
      audio.currentTime = target;
      setCurrentTime(target);
    },
    []
  );

  const seekBy = useCallback(
    (delta: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      const current = audio.currentTime || currentTime;
      const target = Math.max(0, Math.min(current + delta, audio.duration || 0));
      audio.currentTime = target;
      setCurrentTime(target);
    },
    [currentTime]
  );

  const setVolume = useCallback(
    (v: number) => {
      const clamped = Math.max(0, Math.min(1, v));
      setVolumeState(clamped);
      if (audioRef.current) {
        audioRef.current.volume = clamped;
      }
    },
    []
  );

  const setSpeed = useCallback(
    (s: PlaybackSpeed) => {
      setSpeedState(s);
      if (audioRef.current) {
        audioRef.current.playbackRate = s;
      }
    },
    []
  );

  const value = useMemo<AudioController>(
    () => ({
      status,
      isPlaying: status === "playing",
      currentTime,
      duration,
      volume,
      speed,
      src,
      analyser,
      load,
      play,
      pause,
      stop,
      reset,
      toggle,
      seek,
      seekBy,
      setVolume,
      setSpeed,
      setSrc,
    }),
    [
      status,
      currentTime,
      duration,
      volume,
      speed,
      src,
      analyser,
      load,
      play,
      pause,
      stop,
      reset,
      toggle,
      seek,
      seekBy,
      setVolume,
      setSpeed,
      setSrc,
    ]
  );

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer(): AudioController {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) {
    throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  }
  return ctx;
}