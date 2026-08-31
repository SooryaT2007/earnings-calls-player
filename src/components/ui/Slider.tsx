import React, { useRef } from 'react';
import { cn } from '../../lib/utils';

export interface SliderMarker {
  value: number;
  label: string;
  color?: string;
}

interface SliderProps {
  value: number;
  min?: number;
  max: number;
  step?: number;
  buffered?: number;
  markers?: SliderMarker[];
  onMarkerClick?: (marker: SliderMarker) => void;
  onChange: (value: number) => void;
  onChangeEnd?: (value: number) => void;
  className?: string;
  showHoverTime?: boolean;
  formatTooltip?: (val: number) => string;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  min = 0,
  max,
  step = 1,
  buffered = 0,
  markers = [],
  onMarkerClick,
  onChange,
  onChangeEnd,
  className,
  formatTooltip
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverPosition, setHoverPosition] = React.useState<{ percent: number; val: number } | null>(null);
  const [hoveredMarker, setHoveredMarker] = React.useState<SliderMarker | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const safeMax = max > min ? max : min + 1;
  const percentage = Math.min(100, Math.max(0, ((value - min) / (safeMax - min)) * 100));
  const bufferPercentage = Math.min(100, Math.max(0, ((buffered - min) / (safeMax - min)) * 100));

  const calculateValueFromPointer = (clientX: number) => {
    if (!containerRef.current) return value;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const rawVal = min + pos * (safeMax - min);
    return Math.round(rawVal / step) * step;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const newVal = calculateValueFromPointer(e.clientX);
    onChange(newVal);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const hoverVal = min + pos * (safeMax - min);
    setHoverPosition({ percent: pos * 100, val: hoverVal });

    if (isDragging) {
      const newVal = calculateValueFromPointer(e.clientX);
      onChange(newVal);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
      const finalVal = calculateValueFromPointer(e.clientX);
      if (onChangeEnd) {
        onChangeEnd(finalVal);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        setHoverPosition(null);
        setHoveredMarker(null);
      }}
      className={cn(
        "relative group flex items-center h-6 w-full cursor-pointer touch-none select-none",
        className
      )}
    >
      {/* Tooltip on Hover */}
      {(hoveredMarker || (hoverPosition && formatTooltip)) && (
        <div
          style={{
            left: hoveredMarker
              ? `${Math.min(100, Math.max(0, ((hoveredMarker.value - min) / (safeMax - min)) * 100))}%`
              : `${hoverPosition?.percent}%`
          }}
          className="absolute -top-7 -translate-x-1/2 px-2.5 py-0.5 rounded-lg bg-slate-900/95 border border-blue-500/40 backdrop-blur-md text-[10px] font-mono text-blue-300 font-semibold shadow-xl pointer-events-none z-30 whitespace-nowrap flex items-center gap-1.5"
        >
          {hoveredMarker ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>{hoveredMarker.label}</span>
              {formatTooltip && <span className="text-slate-400">({formatTooltip(hoveredMarker.value)})</span>}
            </>
          ) : (
            hoverPosition && formatTooltip && formatTooltip(hoverPosition.val)
          )}
        </div>
      )}

      {/* Track background */}
      <div className="relative w-full h-1.5 group-hover:h-2 bg-white/[0.08] rounded-full overflow-hidden transition-all duration-150">
        {/* Buffer bar */}
        {bufferPercentage > 0 && (
          <div
            style={{ width: `${bufferPercentage}%` }}
            className="absolute top-0 bottom-0 left-0 bg-white/[0.12] transition-all duration-300"
          />
        )}
        {/* Active Fill */}
        <div
          style={{ width: `${percentage}%` }}
          className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-blue-600 to-indigo-400 group-hover:from-blue-500 group-hover:to-cyan-400 rounded-full transition-all duration-75"
        />
      </div>

      {/* Slide Timestamp Markers (Visual Dots on Scrubber) */}
      {markers.map((marker, idx) => {
        const markerPercent = Math.min(100, Math.max(0, ((marker.value - min) / (safeMax - min)) * 100));
        return (
          <div
            key={idx}
            style={{ left: `${markerPercent}%` }}
            onMouseEnter={(e) => {
              e.stopPropagation();
              setHoveredMarker(marker);
            }}
            onMouseLeave={() => setHoveredMarker(null)}
            onClick={(e) => {
              e.stopPropagation();
              if (onMarkerClick) {
                onMarkerClick(marker);
              } else {
                onChange(marker.value);
                if (onChangeEnd) onChangeEnd(marker.value);
              }
            }}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 group/marker p-1 cursor-pointer"
            title={`${marker.label} (${formatTooltip ? formatTooltip(marker.value) : marker.value + 's'})`}
          >
            <div className="w-2 h-2 rounded-full bg-cyan-400 border border-slate-950 shadow-[0_0_8px_rgba(34,211,238,0.8)] group-hover/marker:scale-150 group-hover/marker:bg-white transition-all" />
          </div>
        );
      })}

      {/* Scrubber thumb handle */}
      <div
        style={{ left: `${percentage}%` }}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg transition-transform duration-100 ease-out pointer-events-none z-20",
          isDragging ? "scale-125 ring-4 ring-blue-500/40" : "group-hover:scale-110 opacity-90 group-hover:opacity-100"
        )}
      />
    </div>
  );
};
