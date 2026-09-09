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

type AudioStatus = "idle" | "loading" | "ready" | "playing" | "paused" | "error";

type AudioController = {
  status: AudioStatus;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  speed: PlaybackSpeed;
  src: string | null;
  analyser: AnalyserNode | null;
  load: (url: string, startAt?: number) => void;
  play: () => void;
  pause: () => void;
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
      audio.volume = 0.8;
      audioRef.current = audio;

      try {
        // Wire an analyser so the waveform UI has live frequency data.
        const AudioCtx = window.AudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioCtxRef.current = ctx;
          const source = ctx.createMediaElementSource(audio);
          const vsAnalyser = ctx.createAnalyser();
          vsAnalyser.fftSize = 256;
          vsAnalyser.smoothingTimeConstant = 0.8;
          source.connect(vsAnalyser);
          vsAnalyser.connect(ctx.destination);
          setAnalyser(vsAnalyser);
        }
      } catch {
        // AudioContext may be unavailable; waveform falls back to a static bar.
        setAnalyser(null);
      }

      audio.addEventListener("timeupdate", () =>
        setCurrentTime(audio.currentTime)
      );
      audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));
      audio.addEventListener("durationchange", () => setDuration(audio.duration));
      audio.addEventListener("play", () => setStatus("playing"));
      audio.addEventListener("playing", () => setStatus("playing"));
      audio.addEventListener("pause", () => setStatus("paused"));
      audio.addEventListener("ended", () => setStatus("paused"));
      audio.addEventListener("waiting", () => setStatus("loading"));
      audio.addEventListener("canplay", () => setStatus("ready"));

      audio.addEventListener("error", (e) => {
        const statusCode = (e as unknown as { currentTarget?: { error?: { code?: number } } })
          ?.currentTarget?.error?.code;

        // 404 / 403 (MediaError code 3 = MEDIA_ERR_DECODE, 4 = SRC_NOT_SUPPORTED).
        // Notion's S3 URLs expire after 60 min and can return 403. When that
        // happens we ask the parent to refresh the URL without resetting
        // position.
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
  }, []);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current?.removeAttribute("src");
      audioRef.current = null;
    };
  }, []);

  const load = useCallback(
    (url: string, startAt?: number) => {
      const audio = ensureElement();
      if (!audio) return;
      const wasPlaying = !audio.paused;

      setSrcState(url);
      setStatus("loading");

      audio.src = url;
      audio.load();

      const applyStart = () => {
        if (startAt && Number.isFinite(startAt)) audio.currentTime = startAt;
        if (wasPlaying) void audio.play().catch(() => setStatus("paused"));
      };

      audio.addEventListener("canplay", applyStart, { once: true });
    },
    [ensureElement]
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
    const audio = audioRef.current;
    if (!audio) return;
    const ctx = audioCtxRef.current;
    if (ctx && ctx.state === "suspended") void ctx.resume();
    void audio.play().catch(() => setStatus("paused"));
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    if (audioRef.current?.paused) play();
    else pause();
  }, [play, pause]);

  const seek = useCallback(
    (time: number) => {
      const audio = audioRef.current;
      if (!audio || !Number.isFinite(time)) return;
      audio.currentTime = Math.max(0, Math.min(time, audio.duration || time));
      setCurrentTime(audio.currentTime);
    },
    []
  );

  const seekBy = useCallback(
    (delta: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = Math.max(
        0,
        Math.min(audio.currentTime + delta, audio.duration || 0)
      );
      setCurrentTime(audio.currentTime);
    },
    []
  );

  const setVolume = useCallback(
    (v: number) => {
      setVolumeState(v);
      if (audioRef.current) audioRef.current.volume = v;
    },
    []
  );

  const setSpeed = useCallback(
    (s: PlaybackSpeed) => {
      setSpeedState(s);
      if (audioRef.current) audioRef.current.playbackRate = s;
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