import { getNotionClient } from "./notion-client";
import { notionSchema } from "./notion-config";
import { extractPeriodFromString } from "./filename-parser";
import type { Company, Session } from "@/types";

type DatabaseQueryResponse = {
  object: "list";
  results: Array<{
    id: string;
    created_time: string;
    properties: Record<string, unknown>;
  }>;
  next_cursor: string | null;
  has_more: boolean;
};

type QueryFilter =
  | {
      or?: unknown[];
      and?: unknown[];
      property?: string;
      [key: string]: unknown;
    }
  | undefined;

const companyCache = new Map<string, string>();
let sessionsDbSchemaCache: Record<string, string> | null = null;

/**
 * Retrieves the Earnings Sessions database properties once and caches them,
 * mapping each property name to its Notion property type (e.g. "select",
 * "status", "number"). Used to write polymorphic properties correctly.
 */
export async function getSessionsDbSchema(): Promise<Record<string, string>> {
  if (sessionsDbSchemaCache) return sessionsDbSchemaCache;
  const notion = getNotionClient();
  const { earningsSessions } = requireDbIds();
  const database = await notion.databases.retrieve({ database_id: earningsSessions });
  const properties: Record<string, string> = {};
  const dbProperties = ("properties" in database
    ? database.properties
    : {}) as Record<string, unknown>;
  for (const [name, prop] of Object.entries(dbProperties)) {
    if (prop && typeof prop === "object" && "type" in prop) {
      properties[name] = prop.type as string;
    }
  }
  sessionsDbSchemaCache = properties;
  return properties;
}

/** Clears cached schema (used after structural changes, if needed). */
export function clearSessionsDbSchemaCache(): void {
  sessionsDbSchemaCache = null;
}

function queryDatabase(databaseId: string, body: unknown) {
  const notion = getNotionClient();
  return notion.request<DatabaseQueryResponse>({
    path: `/v1/databases/${databaseId}/query`,
    method: "post",
    body: body as never,
  });
}

function getTitle(dict: unknown): string {
  const value = (dict as { title?: { plain_text?: string }[] } | undefined)
    ?.title;
  return value?.[0]?.plain_text ?? "";
}

function getRichText(dict: unknown): string {
  const value = (dict as { rich_text?: { plain_text?: string }[] })
    ?.rich_text;
  return value?.[0]?.plain_text ?? "";
}

function getFileName(dict: unknown): string | null {
  const files = (dict as
    | { files?: { name?: string; file?: { url?: string } }[] }
    | undefined)?.files;
  return files?.[0]?.name ?? null;
}

export async function fetchCompanies(): Promise<Company[]> {
  const { companies } = requireDbIds();
  const titleProp = notionSchema.companies.titleProperty;

  const response = await queryDatabase(companies, {
    page_size: 100,
    sorts: [{ property: titleProp, direction: "ascending" }],
  });

  return response.results.map((page) => {
    const name = getTitle(page.properties[titleProp]) || getTitle(page.properties["Name"]);
    companyCache.set(page.id, name);
    return { id: page.id, name };
  });
}

export async function fetchSessions(companyId: string): Promise<Session[]> {
  const { earningsSessions } = requireDbIds();
  const companyProp = notionSchema.sessions.companyProperty;

  const companyName = companyCache.get(companyId);

  const filter: QueryFilter = companyName
    ? {
        or: [
          {
            property: companyProp,
            relation: { contains: companyId },
          },
          {
            property: companyProp,
            select: { equals: companyName },
          },
        ],
      }
    : {
        property: companyProp,
        relation: { contains: companyId },
      };

  let response: DatabaseQueryResponse;

  try {
    response = await queryDatabase(earningsSessions, {
      page_size: 100,
      filter,
      sorts: [{ property: notionSchema.sessions.titleProperty, direction: "descending" }],
    });
  } catch {
    // The Company property may be a select rather than a relation. Fall back
    // to filtering on the company name.
    response = await queryDatabase(earningsSessions, {
      page_size: 100,
      filter: companyName
        ? { property: companyProp, select: { equals: companyName } }
        : undefined,
      sorts: [{ property: notionSchema.sessions.titleProperty, direction: "descending" }],
    });
  }

  if (response.results.length) {
    return response.results.map((page) => mapSession(page, companyId));
  }

  if (companyName) {
    const fallback = await queryDatabase(earningsSessions, {
      page_size: 100,
      filter: {
        property: companyProp,
        select: { equals: companyName },
      },
      sorts: [{ property: notionSchema.sessions.titleProperty, direction: "descending" }],
    });
    return fallback.results.map((page) => mapSession(page, companyId));
  }

  return [];
}

function requireDbIds(): { companies: string; earningsSessions: string } {
  const companies = process.env.COMPANIES_DATABASE_ID;
  const earningsSessions = process.env.EARNINGS_SESSIONS_DATABASE_ID;
  if (!companies || !earningsSessions) {
    throw new Error(
      "COMPANIES_DATABASE_ID and EARNINGS_SESSIONS_DATABASE_ID must be configured"
    );
  }
  return { companies, earningsSessions };
}

function mapSession(page: DatabaseQueryResponse["results"][number], companyId: string): Session {
  const props = page.properties;
  const titleProp = notionSchema.sessions.titleProperty;
  const periodProp = notionSchema.sessions.periodProperty;

  const title =
    getTitle(props[titleProp]) ||
    getTitle(props["Name"]) ||
    getTitle(props["Session"]) ||
    getTitle(props["Title"]);

  // Prefer a dedicated Period column when one exists; otherwise derive it
  // from the session title (e.g. "Q1 FY26 Earnings Call" -> "Q1FY26").
  const period =
    (periodProp ? getRichText(props[periodProp]) || getTitle(props[periodProp]) : "") ||
    extractPeriodFromString(title) ||
    title;

  return {
    id: page.id,
    companyId,
    period,
    title,
    createdAt: page.created_time,
    audioUrl: null,
    pdfUrl: null,
    audioFileId: getFileName(props[notionSchema.sessions.audioProperty]),
    pdfFileId: getFileName(props[notionSchema.sessions.pdfProperty]),
    lastListenedTimestamp: null,
    audioDuration: null,
  };
}