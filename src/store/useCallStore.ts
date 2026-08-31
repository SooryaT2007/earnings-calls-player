import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { EarningsCallTab, SlideTimestampLog } from '../types';
import { getLocalFileFromStorage, deleteLocalFilesFromStorage } from '../lib/fileStorage';

export type ReportViewMode = 'horizontal' | 'vertical';

interface CallStoreState {
  tabs: EarningsCallTab[];
  activeTabId: string;
  reportViewMode: ReportViewMode;
  playbackRate: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;

  // Tab Actions
  addTab: (tabData?: Partial<EarningsCallTab>) => string;
  removeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  renameTab: (tabId: string, newTitle: string) => void;
  updateTab: (tabId: string, updates: Partial<EarningsCallTab>) => void;
  rehydrateLocalFiles: () => Promise<void>;
  
  // Playback & Slide Sync Actions
  updatePlaybackTime: (tabId: string, currentTime: number) => void;
  updateCurrentSlide: (tabId: string, currentSlide: number) => void;
  setTotalPages: (tabId: string, totalPages: number) => void;
  setDuration: (tabId: string, duration: number) => void;
  
  // View mode and settings
  setReportViewMode: (mode: ReportViewMode) => void;
  toggleReportViewMode: () => void;
  setIsPlaying: (isPlaying: boolean) => void;
  togglePlayPause: () => void;
  setPlaybackRate: (rate: number) => void;
  cyclePlaybackRate: () => void;
  setVolume: (volume: number) => void;
  setIsMuted: (isMuted: boolean) => void;
  toggleMute: () => void;
  skipTime: (seconds: number) => void;
  resetToDefaults: () => void;
}

const PLAYBACK_RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

const DEFAULT_TABS: EarningsCallTab[] = [
  {
    id: 'tab-1',
    title: 'Call 1',
    audioUrl: '',
    pdfUrl: '',
    currentTime: 0,
    currentSlide: 1,
    totalPages: 1,
    slideTimestamps: []
  }
];

export const useCallStore = create<CallStoreState>()(
  persist(
    (set, get) => ({
      tabs: DEFAULT_TABS,
      activeTabId: DEFAULT_TABS[0].id,
      reportViewMode: 'horizontal',
      playbackRate: 1,
      isPlaying: false,
      volume: 0.85,
      isMuted: false,

      addTab: (tabData) => {
        const id = `tab-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const tabNumber = get().tabs.length + 1;
        const newTab: EarningsCallTab = {
          id,
          title: tabData?.title?.trim() || `Call ${tabNumber}`,
          audioUrl: tabData?.audioUrl || '',
          pdfUrl: tabData?.pdfUrl || '',
          currentTime: tabData?.currentTime || 0,
          currentSlide: tabData?.currentSlide || 1,
          totalPages: tabData?.totalPages || 1,
          isLocalAudio: tabData?.isLocalAudio,
          isLocalPdf: tabData?.isLocalPdf,
          slideTimestamps: []
        };

        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: id,
          isPlaying: false
        }));

        return id;
      },

      removeTab: (tabId) => {
        // Clean up any files in IndexedDB
        deleteLocalFilesFromStorage(tabId);

        set((state) => {
          const newTabs = state.tabs.filter((t) => t.id !== tabId);
          if (newTabs.length === 0) {
            const fallbackId = `tab-${Date.now()}`;
            const fallbackTab: EarningsCallTab = {
              id: fallbackId,
              title: 'Call 1',
              audioUrl: '',
              pdfUrl: '',
              currentTime: 0,
              currentSlide: 1,
              slideTimestamps: []
            };
            return {
              tabs: [fallbackTab],
              activeTabId: fallbackId,
              isPlaying: false
            };
          }

          let nextActiveId = state.activeTabId;
          if (state.activeTabId === tabId) {
            const index = state.tabs.findIndex((t) => t.id === tabId);
            const nextTab = state.tabs[index + 1] || state.tabs[index - 1] || newTabs[0];
            nextActiveId = nextTab.id;
          }

          return {
            tabs: newTabs,
            activeTabId: nextActiveId,
            isPlaying: state.activeTabId === tabId ? false : state.isPlaying
          };
        });
      },

      setActiveTab: (tabId) => {
        const currentActive = get().activeTabId;
        if (currentActive !== tabId) {
          set({
            activeTabId: tabId,
            isPlaying: false
          });
        }
      },

      renameTab: (tabId, newTitle) => {
        const title = newTitle.trim() || 'Untitled Call';
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId ? { ...tab, title } : tab
          )
        }));
      },

      updateTab: (tabId, updates) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId ? { ...tab, ...updates } : tab
          )
        }));
      },

      rehydrateLocalFiles: async () => {
        const currentTabs = get().tabs;
        let hasChanges = false;

        const updatedTabs = await Promise.all(
          currentTabs.map(async (tab) => {
            let updated = { ...tab };

            // Handle stale blob URLs for PDF
            if (tab.pdfUrl && tab.pdfUrl.startsWith('blob:')) {
              const freshPdf = await getLocalFileFromStorage(tab.id, 'pdf');
              if (freshPdf) {
                updated.pdfUrl = freshPdf;
                hasChanges = true;
              } else {
                // Stale blob from previous session that is no longer valid
                updated.pdfUrl = '';
                hasChanges = true;
              }
            }

            // Handle stale blob URLs for Audio
            if (tab.audioUrl && tab.audioUrl.startsWith('blob:')) {
              const freshAudio = await getLocalFileFromStorage(tab.id, 'audio');
              if (freshAudio) {
                updated.audioUrl = freshAudio;
                hasChanges = true;
              } else {
                updated.audioUrl = '';
                hasChanges = true;
              }
            }

            return updated;
          })
        );

        if (hasChanges) {
          set({ tabs: updatedTabs });
        }
      },

      updatePlaybackTime: (tabId, currentTime) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId ? { ...tab, currentTime } : tab
          )
        }));
      },

      updateCurrentSlide: (tabId, currentSlide) => {
        const tab = get().tabs.find((t) => t.id === tabId);
        const currentTime = tab?.currentTime || 0;
        const newLog: SlideTimestampLog = {
          slide: currentSlide,
          timestamp: currentTime,
          recordedAt: Date.now()
        };

        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId
              ? {
                  ...t,
                  currentSlide,
                  slideTimestamps: [...(t.slideTimestamps || []).slice(-49), newLog]
                }
              : t
          )
        }));
      },

      setTotalPages: (tabId, totalPages) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId ? { ...tab, totalPages } : tab
          )
        }));
      },

      setDuration: (tabId, duration) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId ? { ...tab, duration } : tab
          )
        }));
      },

      setReportViewMode: (mode) => set({ reportViewMode: mode }),
      toggleReportViewMode: () =>
        set((state) => ({
          reportViewMode: state.reportViewMode === 'horizontal' ? 'vertical' : 'horizontal'
        })),

      setIsPlaying: (isPlaying) => set({ isPlaying }),
      togglePlayPause: () => set((state) => ({ isPlaying: !state.isPlaying })),
      setPlaybackRate: (playbackRate) => set({ playbackRate }),
      cyclePlaybackRate: () => {
        const currentRate = get().playbackRate;
        const currentIndex = PLAYBACK_RATES.indexOf(currentRate);
        const nextRate = PLAYBACK_RATES[(currentIndex + 1) % PLAYBACK_RATES.length];
        set({ playbackRate: nextRate });
      },
      setVolume: (volume) => set({ volume, isMuted: volume === 0 }),
      setIsMuted: (isMuted) => set({ isMuted }),
      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

      skipTime: (seconds) => {
        const state = get();
        const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
        if (!activeTab) return;
        const cur = activeTab.currentTime || 0;
        const dur = activeTab.duration || 3600;
        const newTime = Math.min(dur, Math.max(0, cur + seconds));
        state.updatePlaybackTime(state.activeTabId, newTime);
      },

      resetToDefaults: () => {
        set({
          tabs: DEFAULT_TABS,
          activeTabId: DEFAULT_TABS[0].id,
          isPlaying: false,
          reportViewMode: 'horizontal',
          playbackRate: 1,
          volume: 0.85,
          isMuted: false
        });
      }
    }),
    {
      name: 'earnings-call-player-store-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        reportViewMode: state.reportViewMode,
        playbackRate: state.playbackRate,
        volume: state.volume
      })
    }
  )
);
