import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useCallStore } from '../../store/useCallStore';
import { formatTime } from '../../lib/utils';
import { Slider, SliderMarker } from '../ui/Slider';
import { Button } from '../ui/Button';
import { saveLocalFileToStorage } from '../../lib/fileStorage';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Volume1,
  Upload,
  History,
  X,
  Check,
  Edit2
} from 'lucide-react';

const PLAYBACK_RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

export const AudioPlayer: React.FC = () => {
  const {
    tabs,
    activeTabId,
    isPlaying,
    setIsPlaying,
    playbackRate,
    setPlaybackRate,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    updatePlaybackTime,
    updateCurrentSlide,
    renameTab,
    updateTab,
    setDuration
  } = useCallStore();

  const currentTab = tabs.find((t) => t.id === activeTabId);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentTimeState, setCurrentTimeState] = useState<number>(currentTab?.currentTime || 0);
  const [durationState, setDurationState] = useState<number>(currentTab?.duration || 0);
  const [bufferedTime, setBufferedTime] = useState<number>(0);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>('');

  const audioUrl = currentTab?.audioUrl || '';
  const currentSlide = currentTab?.currentSlide || 1;

  // Restore audio position when active tab changes
  useEffect(() => {
    if (currentTab) {
      setCurrentTimeState(currentTab.currentTime || 0);
      if (audioRef.current) {
        audioRef.current.currentTime = currentTab.currentTime || 0;
        audioRef.current.playbackRate = playbackRate;
        audioRef.current.volume = isMuted ? 0 : volume;
      }
    }
  }, [activeTabId]);

  // Handle Play/Pause synchronization with state
  useEffect(() => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.play().catch((err) => {
        console.warn('Audio play request failed:', err);
        setIsPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, audioUrl, setIsPlaying]);

  // Update playback rate on audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Update volume and mute state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Audio event listeners
  const onTimeUpdate = () => {
    if (!audioRef.current) return;
    const curTime = audioRef.current.currentTime;
    setCurrentTimeState(curTime);

    // Save timestamp to store (does NOT alter or restrict slides in any way!)
    if (activeTabId) {
      updatePlaybackTime(activeTabId, curTime);
    }

    // Buffer tracking
    if (audioRef.current.buffered.length > 0) {
      const bufferedEnd = audioRef.current.buffered.end(audioRef.current.buffered.length - 1);
      setBufferedTime(bufferedEnd);
    }
  };

  const onLoadedMetadata = () => {
    if (!audioRef.current) return;
    const dur = audioRef.current.duration;
    if (!isNaN(dur) && dur > 0) {
      setDurationState(dur);
      if (activeTabId) {
        setDuration(activeTabId, dur);
      }
    }
    if (currentTab?.currentTime && currentTab.currentTime < dur) {
      audioRef.current.currentTime = currentTab.currentTime;
    }
  };

  const onEnded = () => {
    setIsPlaying(false);
    if (activeTabId) {
      updatePlaybackTime(activeTabId, 0);
    }
  };

  const togglePlayPause = () => {
    if (!audioUrl) return;
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (amount: number) => {
    if (!audioRef.current) return;
    const maxDur = durationState || 3600;
    const newTime = Math.min(maxDur, Math.max(0, audioRef.current.currentTime + amount));
    audioRef.current.currentTime = newTime;
    setCurrentTimeState(newTime);
    if (activeTabId) updatePlaybackTime(activeTabId, newTime);
  };

  const handleScrub = (newVal: number) => {
    setCurrentTimeState(newVal);
    if (audioRef.current) {
      audioRef.current.currentTime = newVal;
    }
  };

  const handleScrubEnd = (newVal: number) => {
    if (activeTabId) {
      updatePlaybackTime(activeTabId, newVal);
    }
  };

  const handleJumpToHistoryTimestamp = (timestamp: number, slide: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = timestamp;
    }
    setCurrentTimeState(timestamp);
    if (activeTabId) {
      updatePlaybackTime(activeTabId, timestamp);
      updateCurrentSlide(activeTabId, slide);
    }
  };

  const handleSelectLocalAudio = async () => {
    if (window.electronAPI) {
      const selected = await window.electronAPI.openAudioDialog();
      if (selected && activeTabId) {
        const url = window.electronAPI.formatLocalPathToUrl(selected);
        updateTab(activeTabId, { audioUrl: url, isLocalAudio: true, currentTime: 0 });
        setIsPlaying(false);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeTabId) {
      const electronPath = (file as any).path;
      if (electronPath && window.electronAPI) {
        const url = window.electronAPI.formatLocalPathToUrl(electronPath);
        updateTab(activeTabId, { audioUrl: url, isLocalAudio: true, currentTime: 0 });
        setIsPlaying(false);
      } else {
        const storedUrl = await saveLocalFileToStorage(activeTabId, 'audio', file);
        updateTab(activeTabId, { audioUrl: storedUrl, isLocalAudio: true, currentTime: 0 });
        setIsPlaying(false);
      }
    }
  };

  const handleSaveTitle = () => {
    if (editTitle.trim() && activeTabId) {
      renameTab(activeTabId, editTitle.trim());
    }
    setIsEditingTitle(false);
  };

  // Convert slideTimestamps into visual markers on the scrubber
  const timelineMarkers = useMemo<SliderMarker[]>(() => {
    if (!currentTab?.slideTimestamps) return [];
    return currentTab.slideTimestamps.map((log) => ({
      value: log.timestamp,
      label: `Slide ${log.slide}`
    }));
  }, [currentTab?.slideTimestamps]);

  const handleMarkerClick = (marker: SliderMarker) => {
    const slideNumber = parseInt(marker.label.replace('Slide ', ''), 10);
    handleJumpToHistoryTimestamp(marker.value, isNaN(slideNumber) ? currentSlide : slideNumber);
  };

  // Keyboard Shortcuts: YouTube-style J-K-L and modifier shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when user is typing in inputs or textareas
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      // Import Audio: Ctrl+Shift+I
      if (e.ctrlKey && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        handleSelectLocalAudio();
      }
      // YouTube-style: K or Space for Play/Pause
      else if (!e.ctrlKey && !e.altKey && !e.metaKey && (e.key.toLowerCase() === 'k' || e.code === 'Space')) {
        e.preventDefault();
        togglePlayPause();
      }
      // YouTube-style: J for Seek Backward 10s (or 5s with Shift)
      else if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        handleSeek(e.shiftKey ? -5 : -10);
      }
      // YouTube-style: L for Seek Forward 10s (or 5s with Shift)
      else if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        handleSeek(e.shiftKey ? 5 : 10);
      }
      // Alt+Left / Alt+Right for 15s skips
      else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(-15);
      }
      else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleSeek(15);
      }
      // Mute / Unmute: Alt+M
      else if (e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggleMute();
      }
      // Volume Up / Down: Ctrl+Up / Ctrl+Down
      else if (e.ctrlKey && e.key === 'ArrowUp') {
        e.preventDefault();
        setVolume(Math.min(1, Number((volume + 0.05).toFixed(2))));
      } else if (e.ctrlKey && e.key === 'ArrowDown') {
        e.preventDefault();
        setVolume(Math.max(0, Number((volume - 0.05).toFixed(2))));
      }
      // Cycle Speed: Alt+R
      else if (e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        const currentIndex = PLAYBACK_RATES.indexOf(playbackRate);
        const nextRate = PLAYBACK_RATES[(currentIndex + 1) % PLAYBACK_RATES.length];
        setPlaybackRate(nextRate);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, audioUrl, volume, playbackRate, currentTimeState, currentSlide, durationState]);

  return (
    <footer className="h-16 border-t border-white/[0.08] bg-slate-950/80 backdrop-blur-2xl flex items-center justify-between px-4 select-none z-30 relative shadow-2xl">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        preload="auto"
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Slide Navigation Timestamps History Drawer */}
      {showHistoryDrawer && (
        <div className="absolute bottom-full right-4 mb-3 w-80 max-h-80 bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl p-4 flex flex-col gap-2.5 z-50 backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-semibold text-white">
                Slide Move Timestamps
              </h3>
            </div>
            <button
              onClick={() => setShowHistoryDrawer(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-y-auto max-h-56 flex flex-col gap-1 pr-1">
            {currentTab?.slideTimestamps && currentTab.slideTimestamps.length > 0 ? (
              [...currentTab.slideTimestamps].reverse().map((log, idx) => (
                <div
                  key={idx}
                  onClick={() => handleJumpToHistoryTimestamp(log.timestamp, log.slide)}
                  className="flex items-center justify-between p-2 rounded-xl bg-white/[0.04] hover:bg-blue-500/20 border border-white/[0.05] hover:border-blue-500/30 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span className="text-xs font-medium text-white group-hover:text-blue-300">
                      Slide {log.slide}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-blue-400 font-semibold">
                    {formatTime(log.timestamp)}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-5 text-xs text-slate-400">
                Move slides while listening to record playback timestamps on the scrubber.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Left: Tab Title & Audio Import */}
      <div className="flex items-center gap-3 w-64 min-w-0 shrink-0">
        <div className="min-w-0 flex-1">
          {isEditingTitle ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                className="bg-slate-900 border border-blue-500/60 rounded px-2 py-0.5 text-xs text-white outline-none w-full"
                autoFocus
              />
              <button onClick={handleSaveTitle} className="text-blue-400 p-0.5">
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div
              className="flex items-center gap-1.5 group cursor-pointer"
              onClick={() => {
                setEditTitle(currentTab?.title || '');
                setIsEditingTitle(true);
              }}
              title="Click to rename"
            >
              <span className="text-xs font-semibold text-white truncate max-w-[150px]">
                {currentTab?.title || 'Untitled Call'}
              </span>
              <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
          <div className="text-[11px] text-slate-400 truncate">
            {audioUrl ? (isPlaying ? 'Playing' : 'Paused') : 'No audio loaded'}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleSelectLocalAudio}
          className="text-xs h-7 px-2.5 bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] hover:border-white/[0.2] text-slate-200 gap-1.5 shrink-0 rounded-xl"
          title="Import Call Audio (Ctrl+Shift+I)"
        >
          <Upload className="w-3 h-3 text-blue-400" />
          <span className="hidden xl:inline">Audio</span>
          <kbd className="text-[9px] font-mono text-slate-400">Ctrl+Shift+I</kbd>
        </Button>
      </div>

      {/* Center: Controls & Scrubber with Slide Dots */}
      <div className="flex flex-col items-center gap-1 flex-1 max-w-2xl px-2">
        {/* Controls Row */}
        <div className="flex items-center gap-3">
          {/* Speed Pills */}
          <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl p-0.5">
            {PLAYBACK_RATES.map((rate) => (
              <button
                key={rate}
                onClick={() => setPlaybackRate(rate)}
                className={`px-1.5 py-0.5 text-[10px] font-medium rounded-lg transition-all ${
                  playbackRate === rate
                    ? 'bg-blue-500 text-white font-bold shadow-md shadow-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                }`}
                title={`Playback Speed ${rate}x (Alt+R)`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Seek -10s / -15s */}
          <button
            onClick={() => handleSeek(-10)}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all flex items-center gap-0.5 text-xs font-medium"
            title="Seek -10s (J or Alt+Left)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono">10s</span>
          </button>

          {/* Main Play / Pause Glass Button */}
          <button
            onClick={togglePlayPause}
            disabled={!audioUrl}
            className={`h-9 w-9 rounded-full flex items-center justify-center transition-all transform active:scale-95 shadow-lg ${
              isPlaying
                ? 'bg-blue-500 text-white shadow-blue-500/40 hover:bg-blue-400'
                : 'bg-white text-slate-950 shadow-white/20 hover:bg-slate-200'
            } disabled:opacity-30 disabled:cursor-not-allowed`}
            title="Play / Pause (K or Space)"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          {/* Seek +10s / +15s */}
          <button
            onClick={() => handleSeek(10)}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all flex items-center gap-0.5 text-xs font-medium"
            title="Seek +10s (L or Alt+Right)"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono">10s</span>
          </button>
        </div>

        {/* Timeline Scrubber with Slide Dots */}
        <div className="flex items-center gap-2.5 w-full">
          <span className="text-[11px] font-mono font-medium text-slate-300 min-w-[38px] text-right">
            {formatTime(currentTimeState)}
          </span>

          <Slider
            value={currentTimeState}
            min={0}
            max={durationState || 100}
            buffered={bufferedTime}
            markers={timelineMarkers}
            onMarkerClick={handleMarkerClick}
            step={0.5}
            onChange={handleScrub}
            onChangeEnd={handleScrubEnd}
            formatTooltip={(val) => formatTime(val)}
            className="flex-1"
          />

          <span className="text-[11px] font-mono text-slate-400 min-w-[38px]">
            {formatTime(durationState)}
          </span>
        </div>
      </div>

      {/* Right: Slide Timestamps & Volume */}
      <div className="flex items-center gap-3 w-64 justify-end shrink-0">
        {/* Slide Timestamps Drawer Button */}
        <button
          onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
            showHistoryDrawer
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.06]'
          }`}
          title="View Slide Move Timestamps"
        >
          <History className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {timelineMarkers.length > 0 ? `${timelineMarkers.length} Markers` : 'Markers'}
          </span>
        </button>

        {/* Volume Control */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleMute}
            className="text-slate-400 hover:text-white transition-colors p-1"
            title={isMuted ? 'Unmute (Alt+M)' : 'Mute (Alt+M)'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            ) : volume < 0.5 ? (
              <Volume1 className="w-3.5 h-3.5 text-blue-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-blue-400" />
            )}
          </button>
          <Slider
            value={isMuted ? 0 : volume * 100}
            min={0}
            max={100}
            step={1}
            onChange={(val) => {
              setVolume(val / 100);
              if (isMuted) toggleMute();
            }}
            className="w-20"
          />
        </div>
      </div>
    </footer>
  );
};
