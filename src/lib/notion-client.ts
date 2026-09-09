import { Client, APIErrorCode } from "@notionhq/client";

let client: Client | null = null;

export function getNotionClient(): Client {
  if (client) return client;

  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    throw new Error(
      "NOTION_API_KEY is not configured. Add it to your .env.local file."
    );
  }

  // Use latest API version to support the file upload / file_upload actions.
  client = new Client({ auth: apiKey, notionVersion: "2026-03-11" });
  return client;
}

export function getDatabaseIds(): { companies: string; earningsSessions: string } {
  const companies = process.env.COMPANIES_DATABASE_ID;
  const earningsSessions = process.env.EARNINGS_SESSIONS_DATABASE_ID;

  if (!companies || !earningsSessions) {
    throw new Error(
      "COMPANIES_DATABASE_ID and EARNINGS_SESSIONS_DATABASE_ID must be configured in .env.local"
    );
  }

  return {
    companies: normalizeNotionId(companies),
    earningsSessions: normalizeNotionId(earningsSessions),
  };
}

/**
 * Normalizes a Notion database/page ID into the hyphenated 8-4-4-4-12 form
 * expected by the public API. Accepts the bare 32-hex-char string that is
 * often copied from the Notion UI.
 */
export function normalizeNotionId(raw: string): string {
  const id = raw.trim();
  if (/^[0-9a-f]{32}$/i.test(id)) {
    return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
  }
  return id;
}

export { APIErrorCode };
