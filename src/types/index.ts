export interface SlideTimestampLog {
  slide: number;
  timestamp: number; // audio playback time in seconds when slide was navigated
  recordedAt: number; // Date.now()
}

export interface EarningsCallTab {
  id: string;
  title: string; // User-renamable tab title
  audioUrl: string;
  pdfUrl: string;
  currentTime: number; // audio playback position in seconds (saved on close/switch)
  currentSlide: number; // PDF page number (1-indexed, saved on change/close)
  totalPages?: number;
  duration?: number;
  isLocalAudio?: boolean;
  isLocalPdf?: boolean;
  slideTimestamps?: SlideTimestampLog[];
}

export type PlaybackRate = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 1.75 | 2;

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      openAudioDialog: () => Promise<string | null>;
      openPdfDialog: () => Promise<string | null>;
      minimizeWindow: () => Promise<void>;
      maximizeWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;
      formatLocalPathToUrl: (filePath: string) => string;
    };
  }
}
