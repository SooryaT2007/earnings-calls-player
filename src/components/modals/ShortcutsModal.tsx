import React from 'react';
import { Modal } from '../ui/Modal';
import {
  FileText,
  Volume2,
  Keyboard,
  Layers,
  Move
} from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutCategory {
  title: string;
  icon: React.ReactNode;
  shortcuts: ShortcutItem[];
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const categories: ShortcutCategory[] = [
    {
      title: 'YouTube Style & Audio Playback',
      icon: <Volume2 className="w-4 h-4 text-cyan-400" />,
      shortcuts: [
        { keys: ['K', 'Space'], description: 'Play / Pause Audio Call' },
        { keys: ['J'], description: 'Seek Backward 10 Seconds' },
        { keys: ['L'], description: 'Seek Forward 10 Seconds' },
        { keys: ['Shift', 'J'], description: 'Seek Backward 5 Seconds' },
        { keys: ['Shift', 'L'], description: 'Seek Forward 5 Seconds' },
        { keys: ['Alt', '←'], description: 'Seek Backward 15 Seconds' },
        { keys: ['Alt', '→'], description: 'Seek Forward 15 Seconds' },
        { keys: ['Alt', 'R'], description: 'Cycle Playback Speed (0.5x → 2.0x)' },
        { keys: ['Alt', 'M'], description: 'Mute / Unmute Audio' },
        { keys: ['Ctrl', '↑'], description: 'Volume Up (+5%)' },
        { keys: ['Ctrl', '↓'], description: 'Volume Down (-5%)' }
      ]
    },
    {
      title: 'Report Views & Navigation (Horizontal vs Vertical)',
      icon: <Layers className="w-4 h-4 text-indigo-400" />,
      shortcuts: [
        { keys: ['Alt', 'H'], description: 'Switch to Horizontal View (Landscape Slides)' },
        { keys: ['Alt', 'V'], description: 'Switch to Vertical View (Pan & Zoom Document)' },
        { keys: ['Alt', 'S'], description: 'Toggle Slide Thumbnails Sidebar' },
        { keys: ['→', 'PageDown'], description: 'Next Slide / Page (Free Navigation)' },
        { keys: ['←', 'PageUp'], description: 'Previous Slide / Page (Free Navigation)' },
        { keys: ['Ctrl', '+'], description: 'Zoom In' },
        { keys: ['Ctrl', '-'], description: 'Zoom Out' },
        { keys: ['Ctrl', '0'], description: 'Reset Zoom / Fit Width' }
      ]
    },
    {
      title: 'Importing & Tab Management',
      icon: <FileText className="w-4 h-4 text-blue-400" />,
      shortcuts: [
        { keys: ['Ctrl', 'I'], description: 'Import / Open PDF Presentation Deck' },
        { keys: ['Ctrl', 'Shift', 'I'], description: 'Import / Open Call Audio File' },
        { keys: ['Ctrl', 'N'], description: 'Open New Earnings Call Tab' },
        { keys: ['Ctrl', 'W'], description: 'Close Current Tab' },
        { keys: ['Ctrl', '1-9'], description: 'Switch Directly to Tab 1-9' }
      ]
    },
    {
      title: 'Vertical Document Pan & Zoom Interactions',
      icon: <Move className="w-4 h-4 text-purple-400" />,
      shortcuts: [
        { keys: ['Mouse Drag'], description: 'Pan / Drag document canvas freely when zoomed in' },
        { keys: ['Ctrl', 'Wheel'], description: 'Smooth Interactive Zoom In/Out' },
        { keys: ['Shift', 'Arrows'], description: 'Nudge pan document up / down / left / right' }
      ]
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts Cheatsheet"
      description="Includes YouTube-style J-K-L audio controls and presentation navigation."
      maxWidth="max-w-3xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {categories.map((cat) => (
          <div
            key={cat.title}
            className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col gap-2.5 shadow-sm"
          >
            <div className="flex items-center gap-2 pb-1.5 border-b border-white/[0.06]">
              {cat.icon}
              <h3 className="text-xs font-semibold tracking-wide text-slate-200">
                {cat.title}
              </h3>
            </div>

            <div className="flex flex-col gap-2">
              {cat.shortcuts.map((sc, i) => (
                <div key={i} className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-slate-300 truncate text-[11.5px]">{sc.description}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {sc.keys.map((k, ki) => (
                      <kbd
                        key={ki}
                        className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-slate-800/80 text-blue-300 border border-white/10 rounded-md shadow-sm"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <Keyboard className="w-3.5 h-3.5 text-blue-400" />
          Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-white/10 rounded text-blue-300 font-medium">F1</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-800 border border-white/10 rounded text-blue-300 font-medium">Ctrl+/</kbd> to toggle this cheatsheet
        </span>
        <button
          onClick={onClose}
          className="px-3.5 py-1 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-medium transition-colors"
        >
          Got it
        </button>
      </div>
    </Modal>
  );
};
