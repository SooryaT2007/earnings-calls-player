export type Company = {
  id: string;
  name: string;
};

export type Session = {
  id: string;
  companyId: string;
  period: string;
  title: string;
  createdAt: string;
  audioUrl: string | null;
  pdfUrl: string | null;
  audioFileId: string | null;
  pdfFileId: string | null;
  lastListenedTimestamp: number | null;
  audioDuration: number | null;
  lastViewedPage?: number | null;
  documentOrientation?: DocumentMode | null;
};

export type DocumentMode = "horizontal" | "vertical";

export type PlaybackSpeed = 1 | 1.25 | 1.5 | 1.75 | 2;

export type UploadFileKind = "pdf" | "audio";

export type ParsedFilename = {
  period?: string;
  kind?: UploadFileKind;
};
