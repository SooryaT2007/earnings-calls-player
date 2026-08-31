import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useCallStore } from '../../store/useCallStore';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  FileText,
  Upload,
  LayoutGrid,
  RotateCw,
  AlertCircle,
  Columns,
  Rows
} from 'lucide-react';
import { Button } from '../ui/Button';
import { saveLocalFileToStorage } from '../../lib/fileStorage';

// Set up pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  onOpenShortcuts?: () => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = () => {
  const {
    tabs,
    activeTabId,
    updateCurrentSlide,
    setTotalPages,
    updateTab,
    reportViewMode,
    setReportViewMode
  } = useCallStore();

  const currentTab = tabs.find((t) => t.id === activeTabId);

  const [numPages, setNumPages] = useState<number>(currentTab?.totalPages || 1);
  const [scale, setScale] = useState<number>(reportViewMode === 'vertical' ? 1.4 : 1.0);
  const [autoFit, setAutoFit] = useState<boolean>(reportViewMode === 'horizontal');
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);
  const [inputPage, setInputPage] = useState<string>(String(currentTab?.currentSlide || 1));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageWidth, setPageWidth] = useState<number>(850);

  // Pan offset for Vertical Pan & Zoom mode
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const currentSlide = currentTab?.currentSlide || 1;
  const pdfUrl = currentTab?.pdfUrl || '';

  // Synchronize input page value when tab or currentSlide changes
  useEffect(() => {
    setInputPage(String(currentSlide));
    setLoadError(null);
  }, [currentSlide, activeTabId]);

  // Adjust default scale when view mode changes
  useEffect(() => {
    if (reportViewMode === 'horizontal') {
      setAutoFit(true);
      setScale(1.0);
      setPanOffset({ x: 0, y: 0 });
    } else {
      setAutoFit(false);
      setScale(1.35);
      setPanOffset({ x: 0, y: 0 });
    }
  }, [reportViewMode]);

  // Update container dimensions
  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const padding = reportViewMode === 'horizontal' ? 32 : 48;
      const width = containerRef.current.clientWidth - padding;
      setPageWidth(Math.max(320, width));
    }
  }, [reportViewMode]);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoadError(null);
    if (activeTabId) {
      setTotalPages(activeTabId, numPages);
      if (currentSlide > numPages) {
        updateCurrentSlide(activeTabId, 1);
      }
    }
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setLoadError(error.message || 'Failed to load PDF document');
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= numPages && activeTabId) {
      updateCurrentSlide(activeTabId, newPage);
      setInputPage(String(newPage));
      setPanOffset({ x: 0, y: 0 });
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(inputPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= numPages) {
      handlePageChange(pageNum);
    } else {
      setInputPage(String(currentSlide));
    }
  };

  const handleZoomIn = () => {
    setAutoFit(false);
    setScale((prev) => Math.min(3.5, Number((prev + 0.2).toFixed(2))));
  };

  const handleZoomOut = () => {
    setAutoFit(false);
    setScale((prev) => Math.max(0.4, Number((prev - 0.2).toFixed(2))));
  };

  const handleResetZoom = () => {
    if (reportViewMode === 'horizontal') {
      setAutoFit(true);
      setScale(1.0);
    } else {
      setAutoFit(false);
      setScale(1.3);
    }
    setPanOffset({ x: 0, y: 0 });
  };

  // Local File Selector for PDF
  const handleSelectLocalPdf = async () => {
    if (window.electronAPI) {
      const selected = await window.electronAPI.openPdfDialog();
      if (selected && activeTabId) {
        const url = window.electronAPI.formatLocalPathToUrl(selected);
        updateTab(activeTabId, { pdfUrl: url, isLocalPdf: true, currentSlide: 1 });
      }
    } else {
      pdfInputRef.current?.click();
    }
  };

  const handlePdfFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeTabId) {
      const electronPath = (file as any).path;
      if (electronPath && window.electronAPI) {
        const url = window.electronAPI.formatLocalPathToUrl(electronPath);
        updateTab(activeTabId, { pdfUrl: url, isLocalPdf: true, currentSlide: 1 });
      } else {
        const storedUrl = await saveLocalFileToStorage(activeTabId, 'pdf', file);
        updateTab(activeTabId, { pdfUrl: storedUrl, isLocalPdf: true, currentSlide: 1 });
      }
    }
  };

  // Mouse Hand Tool Panning for Vertical mode
  const handleMouseDown = (e: React.MouseEvent) => {
    if (reportViewMode === 'vertical') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && reportViewMode === 'vertical') {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Wheel zoom in vertical mode
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      setAutoFit(false);
      setScale((prev) => Math.min(3.5, Math.max(0.4, Number((prev + delta).toFixed(2)))));
    }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      // Import PDF: Ctrl+I
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        handleSelectLocalPdf();
      }
      // View Mode Shortcuts: Alt+H for Horizontal, Alt+V for Vertical
      else if (e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setReportViewMode('horizontal');
      } else if (e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        setReportViewMode('vertical');
      }
      // Thumbnails Toggle: Alt+S
      else if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setShowThumbnails((prev) => !prev);
      }
      // Zoom Shortcuts: Ctrl+= or Ctrl++ for Zoom In, Ctrl+- for Zoom Out, Ctrl+0 for Reset
      else if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
      } else if (e.ctrlKey && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        handleZoomOut();
      } else if (e.ctrlKey && e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      }
      // Page Navigation: Left/Right Arrows or PageUp/PageDown (freely flippable anytime)
      else if (!e.ctrlKey && !e.altKey && (e.key === 'ArrowLeft' || e.key === 'PageUp')) {
        e.preventDefault();
        handlePageChange(currentSlide - 1);
      } else if (!e.ctrlKey && !e.altKey && (e.key === 'ArrowRight' || e.key === 'PageDown')) {
        e.preventDefault();
        handlePageChange(currentSlide + 1);
      }
      // Pan Nudge in Vertical Mode: Shift+Arrows
      else if (reportViewMode === 'vertical' && e.shiftKey) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setPanOffset((prev) => ({ ...prev, y: prev.y + 60 }));
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setPanOffset((prev) => ({ ...prev, y: prev.y - 60 }));
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setPanOffset((prev) => ({ ...prev, x: prev.x + 60 }));
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setPanOffset((prev) => ({ ...prev, x: prev.x - 60 }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, numPages, activeTabId, reportViewMode]);

  return (
    <div className="flex flex-col h-full bg-slate-950/60 select-none overflow-hidden relative">
      {/* Hidden file input */}
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handlePdfFileChange}
      />

      {/* Modern Frosted Glass Header Control Toolbar */}
      <div className="h-11 px-4 border-b border-white/[0.08] bg-slate-950/70 backdrop-blur-xl flex items-center justify-between gap-3 shrink-0 z-20">
        {/* Left: View Mode Pills (Horizontal vs Vertical) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl p-0.5 shadow-inner">
            <button
              onClick={() => setReportViewMode('horizontal')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                reportViewMode === 'horizontal'
                  ? 'bg-blue-500 text-white font-semibold shadow-md shadow-blue-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
              title="Horizontal Deck (Alt+H)"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Horizontal Deck</span>
              <kbd className="text-[9px] font-mono opacity-60 ml-0.5">Alt+H</kbd>
            </button>

            <button
              onClick={() => setReportViewMode('vertical')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                reportViewMode === 'vertical'
                  ? 'bg-blue-500 text-white font-semibold shadow-md shadow-blue-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
              title="Vertical Report (Alt+V)"
            >
              <Rows className="w-3.5 h-3.5" />
              <span>Vertical Report</span>
              <kbd className="text-[9px] font-mono opacity-60 ml-0.5">Alt+V</kbd>
            </button>
          </div>

          {/* Slide Thumbnails Toggle */}
          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition-all ${
              showThumbnails
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.06] border-white/[0.06]'
            }`}
            title="Toggle Slide Thumbnails (Alt+S)"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Slides</span>
            <kbd className="text-[9px] font-mono opacity-60 ml-0.5">Alt+S</kbd>
          </button>
        </div>

        {/* Center: Slide Pagination Controls */}
        <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-2 py-0.5">
          <button
            onClick={() => handlePageChange(currentSlide - 1)}
            disabled={currentSlide <= 1}
            className="p-1 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous Slide (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1 font-mono text-xs px-1">
            <input
              type="text"
              value={inputPage}
              onChange={(e) => setInputPage(e.target.value)}
              onBlur={() => setInputPage(String(currentSlide))}
              className="w-8 h-5 text-center bg-slate-900 border border-white/10 rounded-md text-blue-400 font-semibold focus:outline-none focus:border-blue-500"
            />
            <span className="text-slate-500">/</span>
            <span className="text-slate-400 min-w-[14px] text-center">{numPages}</span>
          </form>

          <button
            onClick={() => handlePageChange(currentSlide + 1)}
            disabled={currentSlide >= numPages}
            className="p-1 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next Slide (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Zoom Controls and Import PDF */}
        <div className="flex items-center gap-2">
          {/* Zoom Buttons */}
          <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl p-0.5">
            <button
              onClick={handleZoomOut}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
              title="Zoom Out (Ctrl+-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleResetZoom}
              className="px-2 py-0.5 text-[11px] font-mono text-slate-300 hover:text-white transition-colors"
              title="Reset Zoom / Fit Width (Ctrl+0)"
            >
              {autoFit ? 'FIT' : `${Math.round(scale * 100)}%`}
            </button>

            <button
              onClick={handleZoomIn}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
              title="Zoom In (Ctrl++)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Import PDF Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectLocalPdf}
            className="text-xs h-7 px-2.5 bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] hover:border-white/[0.2] text-slate-200 gap-1.5 shrink-0 rounded-xl"
            title="Import Presentation PDF (Press Ctrl+I)"
          >
            <Upload className="w-3 h-3 text-blue-400" />
            <span className="hidden sm:inline">Import PDF</span>
            <kbd className="text-[9px] font-mono text-slate-400">Ctrl+I</kbd>
          </Button>
        </div>
      </div>

      {/* Main Presentation View Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Slide Thumbnails Drawer (Optional Sidebar) */}
        {showThumbnails && pdfUrl && (
          <aside className="w-52 border-r border-white/[0.08] bg-slate-950/80 backdrop-blur-xl flex flex-col shrink-0 z-10 animate-in slide-in-from-left-4 duration-200">
            <div className="p-3 border-b border-white/[0.08] flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-blue-400" />
                Slides Overview
              </span>
              <span className="text-[10px] font-mono text-slate-500">{numPages} slides</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2.5">
              <Document file={pdfUrl} loading={null}>
                {Array.from(new Array(numPages), (_, index) => {
                  const pageNum = index + 1;
                  const isSelected = pageNum === currentSlide;

                  return (
                    <div
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`cursor-pointer rounded-xl p-1.5 transition-all flex flex-col items-center gap-1 border ${
                        isSelected
                          ? 'bg-blue-500/20 border-blue-500/60 shadow-lg shadow-blue-500/10'
                          : 'bg-white/[0.02] border-white/[0.06] hover:border-white/20 hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="w-full bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center min-h-[90px] shadow-sm pointer-events-none">
                        <Page
                          pageNumber={pageNum}
                          width={160}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          loading={
                            <div className="h-20 w-full flex items-center justify-center text-[10px] text-slate-600">
                              Slide {pageNum}
                            </div>
                          }
                        />
                      </div>
                      <span className={`text-[10px] font-mono font-medium ${isSelected ? 'text-blue-400 font-bold' : 'text-slate-400'}`}>
                        Slide {pageNum}
                      </span>
                    </div>
                  );
                })}
              </Document>
            </div>
          </aside>
        )}

        {/* Center PDF View Canvas */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          className={`flex-1 overflow-auto flex items-center justify-center p-4 relative ${
            reportViewMode === 'vertical'
              ? isPanning
                ? 'cursor-grabbing select-none'
                : 'cursor-grab'
              : 'cursor-default'
          }`}
        >
          {pdfUrl ? (
            <div
              style={{
                transform: reportViewMode === 'vertical'
                  ? `translate(${panOffset.x}px, ${panOffset.y}px)`
                  : 'none',
                transition: isPanning ? 'none' : 'transform 0.15s ease-out'
              }}
              className="flex items-center justify-center max-w-full"
            >
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
                    <RotateCw className="w-7 h-7 text-blue-400 animate-spin" />
                    <span className="text-xs font-medium">Loading Presentation Deck...</span>
                  </div>
                }
                error={
                  <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-3 bg-white/[0.02] border border-white/10 rounded-2xl">
                    <AlertCircle className="w-8 h-8 text-amber-400" />
                    <span className="text-sm font-semibold text-white">Could not load PDF</span>
                    <p className="text-xs text-slate-400 max-w-md text-center">
                      {loadError || 'The PDF file could not be read or is invalid.'}
                    </p>
                    <Button size="sm" variant="outline" onClick={handleSelectLocalPdf} className="rounded-xl mt-2">
                      Choose PDF File (Ctrl+I)
                    </Button>
                  </div>
                }
              >
                <Page
                  pageNumber={currentSlide}
                  width={reportViewMode === 'horizontal' ? (autoFit ? pageWidth : pageWidth * scale) : undefined}
                  scale={reportViewMode === 'vertical' ? scale : (autoFit ? undefined : scale)}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="transition-all duration-150"
                />
              </Document>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center max-w-md bg-white/[0.02] border border-white/[0.06] rounded-2xl shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">No Presentation Loaded</h3>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                Import a corporate PDF presentation or financial report to accompany the audio call.
              </p>
              <Button
                variant="default"
                size="sm"
                onClick={handleSelectLocalPdf}
                className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl gap-1.5 text-xs font-semibold px-4 py-2"
              >
                <Upload className="w-3.5 h-3.5" />
                Select PDF File (Ctrl+I)
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
