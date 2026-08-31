import React, { useState, useRef, useEffect } from 'react';
import { useCallStore } from '../../store/useCallStore';
import {
  Plus,
  X,
  Keyboard,
  Minus,
  Square,
  Volume2,
  Edit2,
  Check
} from 'lucide-react';

interface TopTabBarProps {
  onOpenNewTabModal: () => void;
  onOpenShortcutsModal: () => void;
}

export const TopTabBar: React.FC<TopTabBarProps> = ({
  onOpenNewTabModal,
  onOpenShortcutsModal
}) => {
  const {
    tabs,
    activeTabId,
    setActiveTab,
    removeTab,
    renameTab,
    isPlaying
  } = useCallStore();

  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTabId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTabId]);

  const handleStartRename = (e: React.MouseEvent, tabId: string, currentTitle: string) => {
    e.stopPropagation();
    setEditingTabId(tabId);
    setEditingTitle(currentTitle);
  };

  const handleSaveRename = (tabId: string) => {
    if (editingTitle.trim()) {
      renameTab(tabId, editingTitle.trim());
    }
    setEditingTabId(null);
  };

  const handleKeyDownRename = (e: React.KeyboardEvent, tabId: string) => {
    if (e.key === 'Enter') {
      handleSaveRename(tabId);
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
    }
  };

  // Electron window controls
  const handleMinimize = () => window.electronAPI?.minimizeWindow();
  const handleMaximize = () => window.electronAPI?.maximizeWindow();
  const handleClose = () => window.electronAPI?.closeWindow();

  return (
    <header className="h-11 border-b border-white/[0.08] bg-slate-950/70 backdrop-blur-xl flex items-center justify-between px-3 select-none z-40 relative">
      {/* Left: App Logo & Tabs Strip */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1 mr-4 py-1">
        {/* App Title Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs font-semibold text-slate-300 shrink-0">
          <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
          <span className="tracking-wide">CallDeck</span>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const isEditing = editingTabId === tab.id;

            return (
              <div
                key={tab.id}
                onClick={() => !isEditing && setActiveTab(tab.id)}
                onDoubleClick={(e) => handleStartRename(e, tab.id, tab.title)}
                className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all duration-200 shrink-0 ${
                  isActive
                    ? 'bg-white/[0.1] text-white border border-white/[0.15] shadow-lg shadow-black/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                {/* Playing Soundwave Indicator */}
                {isActive && isPlaying && (
                  <span className="flex items-center gap-0.5 shrink-0 text-blue-400">
                    <Volume2 className="w-3 h-3 animate-pulse" />
                  </span>
                )}

                {/* Tab Title (Editable) */}
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => handleSaveRename(tab.id)}
                      onKeyDown={(e) => handleKeyDownRename(e, tab.id)}
                      className="bg-slate-900 border border-blue-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-28"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveRename(tab.id);
                      }}
                      className="p-0.5 text-blue-400 hover:text-blue-300"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate max-w-[140px] font-medium" title="Double click to rename">
                      {tab.title}
                    </span>
                    <button
                      onClick={(e) => handleStartRename(e, tab.id, tab.title)}
                      className="p-0.5 text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Rename tab"
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}

                {/* Close Tab Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTab(tab.id);
                  }}
                  className="p-0.5 rounded-md text-slate-500 hover:text-rose-300 hover:bg-white/[0.08] transition-colors"
                  title="Close tab (Ctrl+W)"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {/* Quick Add Tab Button */}
          <button
            onClick={onOpenNewTabModal}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.05] transition-all"
            title="New Tab (Ctrl+N)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right Controls: Shortcuts Cheatsheet & Window Controls */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenShortcutsModal}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 hover:text-white text-xs transition-all"
          title="Keyboard Shortcuts Cheatsheet (F1 or Ctrl+/)"
        >
          <Keyboard className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">Shortcuts</span>
        </button>

        {/* Native Electron Window Controls */}
        {window.electronAPI?.isElectron && (
          <div className="flex items-center gap-1 ml-1 pl-2 border-l border-white/[0.08]">
            <button
              onClick={handleMinimize}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/[0.08]"
              title="Minimize"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              onClick={handleMaximize}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/[0.08]"
              title="Maximize"
            >
              <Square className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
              title="Close"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
