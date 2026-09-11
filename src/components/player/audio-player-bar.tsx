"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAudioPlayer, PLAYBACK_SPEEDS } from "@/components/providers/audio-player-provider";
import { useAppState } from "@/components/providers/app-provider";
import { cn, formatTime } from "@/lib/utils";
import { IconButton, Tooltip } from "@/components/ui/primitives";

const BAR_COUNT = 90;

function Waveform({ analyser, isPlaying }: { analyser: AnalyserNode | null; isPlaying: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (!analyser || !dataRef.current || !isPlaying) {
      // Static decorative bars when paused or no analyser
      const bars: number[] = [];
      for (let i = 0; i < BAR_COUNT; i++) {
        const v =
          0.15 +
          0.45 * Math.abs(Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.5 +
          0.2;
        bars.push(v);
      }
      renderBars(bars, false);
      return;
    }

    analyser.getByteFrequencyData(dataRef.current);
    const values = dataRef.current;
    const bars: number[] = [];
    const step = Math.max(1, Math.floor(values.length / BAR_COUNT));
    for (let i = 0; i < BAR_COUNT; i++) {
      let sum = 0;
      let count = 0;
      for (let j = i * step; j < Math.min((i + 1) * step, values.length); j++) {
        sum += values[j];
        count++;
      }
      const avg = count > 0 ? sum / count : 0;
      bars.push(avg / 255);
    }
    renderBars(bars, true);

    function renderBars(bars: number[], live: boolean) {
      const barWidth = width / BAR_COUNT;
      const gap = barWidth * 0.3;
      for (let i = 0; i < bars.length; i++) {
        const v = Math.max(0.05, Math.min(1, bars[i]));
        const barH = Math.max(3, v * height * 0.85);
        const x = i * barWidth;
        const y = (height - barH) / 2;
        ctx.fillStyle = live ? "#38bdf8" : "#64748b";
        ctx.globalAlpha = live ? 0.6 + 0.4 * v : 0.4;
        ctx.fillRect(x, y, Math.max(1, barWidth - gap), barH);
      }
      ctx.globalAlpha = 1;
    }
  }, [analyser, isPlaying]);

  useEffect(() => {
    if (analyser) {
      dataRef.current = new Uint8Array(analyser.frequencyBinCount);
    }
  }, [analyser]);

  useEffect(() => {
    let raf: number;
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="h-10 w-full"
      style={{ aspectRatio: "auto" }}
      width={720}
      height={40}
    />
  );
}

export function AudioPlayerBar() {
  const {
    status,
    currentTime,
    duration,
    volume,
    speed,
    isPlaying,
    analyser,
    toggle,
    seek,
    seekBy,
    setVolume,
    setSpeed,
  } = useAudioPlayer();
  const { activeSession, audioUrls } = useAppState();

  const [speedOpen, setSpeedOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef<HTMLDivElement>(null);

  const hasAudioTrack = Boolean(activeSession && (audioUrls?.audio || activeSession.audioFileId));
  const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  const handleScrub = useCallback(
    (clientX: number) => {
      const el = barRef.current;
      if (!el || duration <= 0) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      seek(ratio * duration);
    },
    [duration, seek]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      handleScrub(e.clientX);
    },
    [handleScrub]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.buttons === 1) handleScrub(e.clientX);
    },
    [handleScrub]
  );

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (speedRef.current && !speedRef.current.contains(e.target as Node)) {
        setSpeedOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    if (duration <= 0) setSpeedOpen(false);
  }, [duration]);

  const playDisabled = status === "idle" || status === "error" || !activeSession || !hasAudioTrack;

  return (
    <div className="flex h-20 shrink-0 items-center justify-between gap-4 border-t border-surface-800 bg-surface-900 px-4">
      {/* Left: Quarter identity & playback controls */}
      <div className="flex items-center gap-3">
        {/* Session Info Badge */}
        {activeSession ? (
          <div className="hidden max-w-[180px] flex-col sm:flex">
            <span className="truncate text-xs font-semibold text-zinc-200">
              {activeSession.period}
            </span>
            <span className="truncate text-[11px] text-zinc-500">
              {hasAudioTrack ? activeSession.title : "No audio recording"}
            </span>
          </div>
        ) : (
          <div className="hidden max-w-[180px] flex-col sm:flex">
            <span className="text-xs text-zinc-500">No session selected</span>
          </div>
        )}

        <div className="h-6 w-px bg-surface-800 hidden sm:block" />

        {/* Play/Pause Button */}
        <Tooltip label={isPlaying ? "Pause (Space)" : "Play (Space)"}>
          <IconButton
            onClick={toggle}
            disabled={playDisabled}
            title={isPlaying ? "Pause" : "Play"}
            className="h-10 w-10 bg-accent-600/20 text-accent-400 hover:bg-accent-600/30 hover:text-accent-300 disabled:bg-surface-800 disabled:text-zinc-600"
          >
            {isPlaying ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg className="h-5 w-5 translate-x-0.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5.14v13.72c0 .82.89 1.32 1.59.89l10.4-6.86a1.06 1.06 0 000-1.78L9.59 4.25A1.05 1.05 0 008 5.14z" />
              </svg>
            )}
          </IconButton>
        </Tooltip>

        {/* Rewind 10s */}
        <Tooltip label="Rewind 10s (J)">
          <IconButton onClick={() => seekBy(-10)} title="Rewind 10s" disabled={playDisabled}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 19l-6-7 6-7" />
              <path d="M18 19l-6-7 6-7" />
            </svg>
          </IconButton>
        </Tooltip>

        {/* Timestamp Display */}
        <span className="w-20 text-center text-xs font-mono tabular-nums text-zinc-400">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Forward 10s */}
        <Tooltip label="Forward 10s (L)">
          <IconButton onClick={() => seekBy(10)} title="Forward 10s" disabled={playDisabled}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 5l6 7-6 7" />
              <path d="M6 5l6 7-6 7" />
            </svg>
          </IconButton>
        </Tooltip>

        {status === "loading" && (
          <span className="text-[11px] font-medium text-amber-400 animate-pulse">buffering…</span>
        )}
      </div>

      {/* Center: Interactive Waveform Scrubber */}
      <div className="flex flex-1 items-center px-2">
        <div className="relative flex-1">
          <div
            ref={barRef}
            className={cn(
              "group relative cursor-pointer overflow-hidden rounded-lg bg-surface-950/80 p-1 ring-1 ring-surface-800",
              !hasAudioTrack && "pointer-events-none opacity-40"
            )}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
          >
            <Waveform analyser={analyser} isPlaying={isPlaying} />
            {/* Scrubber Progress Overlay */}
            <div
              className="pointer-events-none absolute inset-0 rounded-lg"
              style={{
                background: `linear-gradient(to right, rgba(56, 189, 248, 0.15) ${
                  progress * 100
                }%, rgba(0,0,0,0.5) ${progress * 100}%)`,
              }}
            />
            {/* Playhead Marker */}
            <div
              className="pointer-events-none absolute left-0 top-0 h-full w-1 bg-sky-400 shadow-lg shadow-sky-400/50 transition-[left] duration-75"
              style={{ left: `calc(${progress * 100}% - 2px)` }}
            />
          </div>
        </div>
      </div>

      {/* Right: Volume & Playback Speed */}
      <div className="flex items-center gap-3">
        {/* Volume Mute/Unmute */}
        <IconButton
          onClick={() => setVolume(volume <= 0 ? 0.8 : 0)}
          title={volume === 0 ? "Unmute" : "Mute"}
        >
          {volume === 0 ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5L6 9H3v6h3l5 4V5z" />
              <path d="M22 9l-6 6M16 9l6 6" />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5L6 9H3v6h3l5 4V5z" />
              <path d="M15.5 8.5c1 1.5 1 5.5 0 7" />
              <path d="M18.5 6c2 2.5 2 9.5 0 12" />
            </svg>
          )}
        </IconButton>

        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          aria-label="Volume"
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-16 accent-sky-500 cursor-pointer"
        />

        {/* Speed Selector Dropdown */}
        <div className="relative" ref={speedRef}>
          <Tooltip label="Playback speed (Shift + < / >)">
            <IconButton
              onClick={() => setSpeedOpen((open) => !open)}
              title="Playback speed"
              className={cn(
                "w-auto px-2 text-xs font-semibold",
                speed !== 1 && "text-sky-400"
              )}
            >
              {speed}x
            </IconButton>
          </Tooltip>

          {speedOpen && (
            <div className="absolute bottom-full right-0 z-50 mb-2 w-28 rounded-lg border border-surface-700 bg-surface-850 p-1 shadow-2xl animate-fade-in">
              {PLAYBACK_SPEEDS.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setSpeed(option);
                    setSpeedOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium",
                    option === speed
                      ? "bg-sky-500/20 text-sky-400"
                      : "text-zinc-300 hover:bg-surface-700 hover:text-white"
                  )}
                >
                  <span>{option}x</span>
                  {option === speed && (
                    <span className="text-xs text-sky-400">•</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}