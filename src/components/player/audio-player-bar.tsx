"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAudioPlayer, PLAYBACK_SPEEDS } from "@/components/providers/audio-player-provider";
import { useAppState } from "@/components/providers/app-provider";
import { cn, formatTime } from "@/lib/utils";
import { IconButton, Tooltip } from "@/components/ui/primitives";
import type { PlaybackSpeed } from "@/types";

const BAR_COUNT = 90;

function Waveform({ analyser }: { analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (!analyser || !dataRef.current) {
      // Static placeholder bars when not playing / no analyser.
      const bars: number[] = [];
      for (let i = 0; i < BAR_COUNT; i++) {
        const v =
          0.15 +
          0.55 * Math.abs(Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.5 +
          0.3;
        bars.push(v);
      }
      renderBars(bars);
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
    renderBars(bars);

    function renderBars(bars: number[]) {
      const barWidth = width / BAR_COUNT;
      const gap = barWidth * 0.25;
      for (let i = 0; i < bars.length; i++) {
        const v = Math.max(0.03, Math.min(1, bars[i]));
        const barH = Math.max(2, v * height * 0.9);
        const x = i * barWidth;
        const y = (height - barH) / 2;
        ctx.fillStyle = "#3b82f6";
        ctx.globalAlpha = 0.5 + 0.5 * v;
        ctx.fillRect(x, y, barWidth - gap, barH);
      }
      ctx.globalAlpha = 1;
    }
  }, [analyser]);

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
      className="h-12 w-full"
      style={{ aspectRatio: "auto" }}
      width={720}
      height={48}
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
  const { activeSession } = useAppState();

  const [speedOpen, setSpeedOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef<HTMLDivElement>(null);

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

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
      if (
        speedRef.current &&
        !speedRef.current.contains(e.target as Node)
      ) {
        setSpeedOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Hide speed dropdown when duration is 0.
  useEffect(() => {
    if (duration <= 0) setSpeedOpen(false);
  }, [duration]);

  const playDisabled = status === "idle" || status === "error" || !activeSession;

  return (
    <div className="flex h-20 shrink-0 items-stretch gap-3 border-t border-surface-800 bg-surface-900 px-4">
      <div className="flex items-center gap-2">
        <Tooltip label={isPlaying ? "Pause (Space)" : "Play (Space)"}>
          <IconButton
            onClick={toggle}
            disabled={playDisabled}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5.14v13.72c0 .82.89 1.32 1.59.89l10.4-6.86a1.06 1.06 0 000-1.78L9.59 4.25A1.05 1.05 0 008 5.14z" />
              </svg>
            )}
          </IconButton>
        </Tooltip>

        <Tooltip label="Rewind 10s (J)">
          <IconButton onClick={() => seekBy(-10)} title="Rewind 10s" disabled={playDisabled}>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 19l-6-7 6-7" />
              <path d="M18 19l-6-7 6-7" />
              <path d="M4 12h12" opacity="0" />
            </svg>
          </IconButton>
        </Tooltip>

        <span className="w-16 text-center text-xs tabular-nums text-zinc-400">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <Tooltip label="Forward 10s (L)">
          <IconButton onClick={() => seekBy(10)} title="Forward 10s" disabled={playDisabled}>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 5l6 7-6 7" />
              <path d="M6 5l6 7-6 7" />
            </svg>
          </IconButton>
        </Tooltip>

        {status === "loading" && (
          <span className="ml-1 text-[10px] text-zinc-500">buffering…</span>
        )}
      </div>

      <div className="flex flex-1 items-center gap-3">
        <div className="relative flex-1">
          <div
            ref={barRef}
            className="group cursor-pointer overflow-hidden rounded-md"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
          >
            <Waveform analyser={isPlaying ? analyser : null} />
          </div>
          {/* scrub overlay indicating playback progress */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `linear-gradient(to right, transparent ${
                progress * 100
              }%, rgba(9,9,15,0.55) ${progress * 100}%)`,
              borderRadius: 6,
            }}
          />
          <div
            className="pointer-events-none absolute left-0 top-0 h-full w-0.5 bg-accent-500 transition-[left] duration-75"
            style={{ left: `calc(${progress * 100}% - 1px)` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <IconButton
          onClick={() => setVolume(volume <= 0 ? 0.8 : 0)}
          title={volume === 0 ? "Unmute" : "Mute"}
        >
          {volume === 0 ? (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5L6 9H3v6h3l5 4V5z" />
              <path d="M22 9l-6 6M16 9l6 6" />
            </svg>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          className="w-20 accent-blue-500"
        />

        <div className="relative" ref={speedRef}>
          <Tooltip label="Playback speed (Shift + , / .)">
            <IconButton
              onClick={() => setSpeedOpen((open) => !open)}
              title="Playback speed"
              className={cn("w-auto px-2 text-xs font-semibold", 
                speed !== 1 && "text-accent-400")}
            >
              {speed}x
            </IconButton>
          </Tooltip>

          {speedOpen && (
            <div className="absolute bottom-full right-0 z-50 mb-1 w-32 rounded-lg border border-surface-700 bg-surface-800 p-1 shadow-xl animate-fade-in">
              {PLAYBACK_SPEEDS.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setSpeed(option);
                    setSpeedOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm",
                    option === speed
                      ? "bg-accent-600/20 text-accent-400"
                      : "text-zinc-300 hover:bg-surface-700"
                  )}
                >
                  {option}x
                  {option === speed && (
                    <span className="text-xs text-accent-400">•</span>
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