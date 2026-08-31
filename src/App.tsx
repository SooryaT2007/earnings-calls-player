import React, { useState, useEffect } from 'react';
import { useCallStore } from './store/useCallStore';
import { TopTabBar } from './components/layout/TopTabBar';
import { PdfViewer } from './components/pdf/PdfViewer';
import { AudioPlayer } from './components/audio/AudioPlayer';
import { NewTabModal } from './components/modals/NewTabModal';
import { ShortcutsModal } from './components/modals/ShortcutsModal';

export const App: React.FC = () => {
  const [isNewTabModalOpen, setIsNewTabModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const {
    tabs,
    activeTabId,
    setActiveTab,
    removeTab,
    rehydrateLocalFiles
  } = useCallStore();

  const currentTab = tabs.find((t) => t.id === activeTabId);

  // Restore local IndexedDB files or clean stale blob URLs on startup
  useEffect(() => {
    rehydrateLocalFiles();
  }, [rehydrateLocalFiles]);

  // Show brief toast feedback
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 1800);
  };

  // Global Keyboard Shortcuts Listener for Tabs and Modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing inside an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      // Help / Cheatsheet Shortcut (F1 or Ctrl+/)
      if (e.key === 'F1' || (e.ctrlKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
      }
      // New Tab / New Call (Ctrl+N or Ctrl+T)
      else if (e.ctrlKey && !e.shiftKey && (e.key.toLowerCase() === 'n' || e.key.toLowerCase() === 't')) {
        e.preventDefault();
        setIsNewTabModalOpen(true);
      }
      // Close Tab (Ctrl+W)
      else if (e.ctrlKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (activeTabId) {
          removeTab(activeTabId);
          showToast("Tab Closed");
        }
      }
      // Switch Tab by number (Ctrl+1 through Ctrl+9)
      else if (e.ctrlKey && !isNaN(Number(e.key)) && Number(e.key) >= 1 && Number(e.key) <= 9) {
        e.preventDefault();
        const tabIndex = Number(e.key) - 1;
        if (tabs[tabIndex]) {
          setActiveTab(tabs[tabIndex].id);
          showToast(`Switched to ${tabs[tabIndex].title}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, tabs, setActiveTab, removeTab]);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden select-none font-sans relative">
      {/* Top Browser Tab Bar */}
      <TopTabBar
        onOpenNewTabModal={() => setIsNewTabModalOpen(true)}
        onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
      />

      {/* Main Full-Space Report View: Horizontal / Vertical Presentation Decks */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-950 relative">
        {currentTab ? (
          <PdfViewer onOpenShortcuts={() => setIsShortcutsModalOpen(true)} />
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 text-center p-8 bg-slate-950">
            <h2 className="text-lg font-bold text-white mb-2">No Active Call Selected</h2>
            <p className="text-sm text-slate-400 max-w-md mb-4">
              Open a new tab or choose one of the pre-configured corporate earnings calls to begin.
            </p>
            <button
              onClick={() => setIsNewTabModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
            >
              Open Earnings Call (Ctrl+N)
            </button>
          </div>
        )}
      </main>

      {/* Bottom Docked Audio Player Bar */}
      {currentTab && <AudioPlayer />}

      {/* Realtime Toast Notifications for Keyboard Shortcuts */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-lg bg-slate-900/95 border border-emerald-500/50 text-emerald-300 font-mono text-xs shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-100 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* New Tab / Presets Modal */}
      <NewTabModal
        isOpen={isNewTabModalOpen}
        onClose={() => setIsNewTabModalOpen(false)}
      />

      {/* Keyboard Shortcuts Cheatsheet Modal */}
      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
};

export default App;
