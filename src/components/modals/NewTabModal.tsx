import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useCallStore } from '../../store/useCallStore';
import {
  FileText,
  Radio,
  Plus
} from 'lucide-react';

interface NewTabModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewTabModal: React.FC<NewTabModalProps> = ({ isOpen, onClose }) => {
  const { addTab } = useCallStore();

  const [title, setTitle] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTab({
      title: title.trim() || 'New Call',
      audioUrl: audioUrl.trim(),
      pdfUrl: pdfUrl.trim(),
      currentTime: 0,
      currentSlide: 1
    });

    // Reset & Close
    setTitle('');
    setAudioUrl('');
    setPdfUrl('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Open New Call Tab"
      description="Create a custom earnings call session with your audio and PDF files."
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Tab Name
          </label>
          <input
            type="text"
            placeholder="e.g. Apple Q4 Call, Tesla Deck, Custom Session"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-blue-400" />
            Audio URL or Path (Optional)
          </label>
          <input
            type="text"
            placeholder="https://... or local audio file path"
            value={audioUrl}
            onChange={(e) => setAudioUrl(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            You can also import files directly with <kbd className="px-1 py-0.2 bg-slate-800 rounded text-slate-300">Ctrl+Shift+I</kbd>.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            PDF Presentation URL or Path (Optional)
          </label>
          <input
            type="text"
            placeholder="https://... or local pdf file path"
            value={pdfUrl}
            onChange={(e) => setPdfUrl(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            You can also import presentations directly with <kbd className="px-1 py-0.2 bg-slate-800 rounded text-slate-300">Ctrl+I</kbd>.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            Cancel
          </button>
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold px-4 py-1.5 gap-1.5 shadow-lg shadow-blue-500/25"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Tab
          </Button>
        </div>
      </form>
    </Modal>
  );
};
