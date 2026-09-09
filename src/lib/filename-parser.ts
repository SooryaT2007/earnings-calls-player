import type { ParsedFilename, UploadFileKind } from "@/types";

/**
 * Matches fiscal quarter / period patterns embedded in filenames.
 * Examples:
 *   "Q1FY27 Call.pdf"          -> "Q1FY27"
 *   "Acme_FY26_Q2_Transcript"  -> "Q2FY26"
 *   "Q3 FY25 results"          -> "Q3FY25"
 *   "FY2026-Q1.mp3"            -> "Q1FY26"
 *   "FY26 Q4 audio"            -> "Q4FY26"
 */
const PERIOD_PATTERNS: RegExp[] = [
  /\bQ([1-4])[-\s_.]?FY(\d{2,4})\b/i,
  /\bQ([1-4])[-\s_.]?(\d{2,4})\b/i,
  /\bFY(\d{2,4})[-\s_.]?Q([1-4])\b/i,
];

const AUDIO_EXTENSIONS = [
  ".mp3",
  ".wav",
  ".m4a",
  ".aac",
  ".flac",
  ".ogg",
  ".oga",
  ".wma",
  ".opus",
  ".webm",
];

const PDF_EXTENSION = ".pdf";

function normalizeYear(raw: string): string {
  // e.g. "27" -> "27", "2026" -> "26"
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 4) return digits.slice(-2);
  return digits;
}

/**
 * Deterministic filename parsing that extracts the period (e.g. Q1FY27)
 * and the file kind (pdf/audio) from a filename.
 */
export function parseFilename(filename: string): ParsedFilename {
  const lower = filename.toLowerCase();

  let kind: UploadFileKind | undefined;
  if (lower.endsWith(PDF_EXTENSION)) {
    kind = "pdf";
  } else if (
    AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext))
  ) {
    kind = "audio";
  }

  let period: string | undefined;

  for (const pattern of PERIOD_PATTERNS) {
    const match = filename.match(pattern);
    if (match) {
      if (match[2] && /^fy|^\d/i.test(match[2] ?? "") && match[1]) {
        // Q1 FY27
        period = `Q${match[1]}FY${normalizeYear(match[2])}`;
      } else if (match[1] && match[2]) {
        // Q1 2026 or Q1 27
        period = `Q${match[1]}FY${normalizeYear(match[2])}`;
      } else if (match[1]) {
        period = `Q${match[1]}`;
      }
      break;
    }
  }

  // Fallback: FY27 Q4 style
  if (!period) {
    const fyMatch = filename.match(/\bFY(\d{2,4})\b/i);
    const qMatch = filename.match(/\bQ([1-4])\b/i);
    if (fyMatch && qMatch) {
      period = `Q${qMatch[1]}FY${normalizeYear(fyMatch[1])}`;
    }
  }

  return { period, kind };
}

/**
 * Extracts a period string (e.g. "Q1FY26") from arbitrary text such as a
 * session title ("Q1 2026 Earnings Call") or a file name.
 */
export function extractPeriodFromString(text: string): string | undefined {
  return parseFilename(text).period;
}
