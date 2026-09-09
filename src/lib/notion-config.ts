/**
 * Maps the app to your exact Notion database schema.
 *
 * Defaults match the "Companies Research" workspace setup:
 *  - Companies DB:        Name (title)
 *  - Earnings Calls DB:   Session Name (title), Company (relation),
 *                         Call Audio (url/files), Presentation (url/files),
 *                         Document Orientation (select/status),
 *                         Latest Timestamp (number), Last Viewed Page (number)
 *
 * Every value can be overridden via environment variables if you rename
 * columns later.
 */

function envString(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

function envStringOrNull(name: string): string | null {
  const value = process.env[name];
  return value === undefined || value === "" ? null : value;
}

export const notionSchema = {
  companies: {
    titleProperty: envString("COMPANIES_TITLE_PROPERTY", "Name"),
  },
  sessions: {
    titleProperty: envString("SESSIONS_TITLE_PROPERTY", "Session Name"),
    companyProperty: envString("SESSIONS_COMPANY_PROPERTY", "Company"),
    // Your database has no dedicated Period column; the period is embedded
    // in Session Name (e.g. "Q1 FY26 Earnings Call"). Set
    // SESSIONS_PERIOD_PROPERTY to enable a dedicated rich-text column.
    periodProperty: envStringOrNull("SESSIONS_PERIOD_PROPERTY"),
    audioProperty: envString("SESSIONS_AUDIO_PROPERTY", "Call Audio"),
    pdfProperty: envString("SESSIONS_PDF_PROPERTY", "Presentation"),
    latestTimestampProperty: envString(
      "SESSIONS_LAST_LISTENED_PROPERTY",
      "Latest Timestamp"
    ),
    lastViewedPageProperty: envString(
      "SESSIONS_LAST_VIEWED_PAGE_PROPERTY",
      "Last Viewed Page"
    ),
    documentOrientationProperty: envString(
      "SESSIONS_DOCUMENT_ORIENTATION_PROPERTY",
      "Document Orientation"
    ),
  },
} as const;