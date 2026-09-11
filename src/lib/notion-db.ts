import { getNotionClient, normalizeNotionId } from "./notion-client";
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

const dataSourceIdCache = new Map<string, string>();
let sessionsDbSchemaCache: Record<string, string> | null = null;

/**
 * Resolves the data source ID associated with a database. In the current
 * Notion API, databases are queried through their data source
 * (POST /v1/data_sources/{data_source_id}/query), so the app maps each
 * database ID to its data source once and caches it.
 */
async function getDataSourceIdForDatabase(databaseId: string): Promise<string> {
  const cached = dataSourceIdCache.get(databaseId);
  if (cached) return cached;

  const notion = getNotionClient();
  const database = await notion.databases.retrieve({ database_id: databaseId });
  const sources =
    "data_sources" in database && database.data_sources ? database.data_sources : [];
  const dataSourceId = sources[0]?.id;

  if (!dataSourceId) {
    throw new Error(
      `Database ${databaseId} has no associated data source. Make sure it is shared with your integration.`
    );
  }

  dataSourceIdCache.set(databaseId, dataSourceId);
  return dataSourceId;
}

/**
 * Retrieves the Earnings Sessions database properties once and caches them,
 * mapping each property name to its Notion property type (e.g. "select",
 * "status", "number"). Property definitions live on the data source in the
 * current API. Used to write polymorphic properties correctly.
 */
export async function getSessionsDbSchema(): Promise<Record<string, string>> {
  if (sessionsDbSchemaCache) return sessionsDbSchemaCache;
  const notion = getNotionClient();
  const { earningsSessions } = requireDbIds();
  const dataSourceId = await getDataSourceIdForDatabase(earningsSessions);

  const source = await notion.dataSources.retrieve({ data_source_id: dataSourceId });
  const properties: Record<string, string> = {};
  const dsProperties =
    "properties" in source && source.properties ? source.properties : {};
  for (const [name, prop] of Object.entries(dsProperties)) {
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

async function queryDatabase(databaseId: string, body: unknown) {
  const notion = getNotionClient();
  const dataSourceId = await getDataSourceIdForDatabase(databaseId);
  // NOTE: paths are relative to the SDK's base URL (https://api.notion.com/v1)
  // and must NOT include the "/v1/" segment.
  return notion.request<DatabaseQueryResponse>({
    path: `data_sources/${dataSourceId}/query`,
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

function getNumber(dict: unknown): number | null {
  const value = (dict as { number?: number | null } | undefined)?.number;
  return typeof value === "number" ? value : null;
}

function getSelectOrStatus(dict: unknown): "horizontal" | "vertical" | null {
  const select = (dict as { select?: { name?: string } } | undefined)?.select?.name;
  if (select === "horizontal" || select === "vertical") return select;
  const status = (dict as { status?: { name?: string } } | undefined)?.status?.name;
  if (status === "horizontal" || status === "vertical") return status;
  return null;
}

function getMultiSelect(dict: unknown): string[] {
  const list = (dict as { multi_select?: Array<{ name: string }> } | undefined)?.multi_select;
  return Array.isArray(list) ? list.map((item) => item.name).filter(Boolean) : [];
}

function getSelect(dict: unknown): string | null {
  const value = (dict as { select?: { name?: string } } | undefined)?.select?.name;
  return value ?? null;
}

export async function fetchCompanies(): Promise<Company[]> {
  const { companies } = requireDbIds();
  const titleProp = notionSchema.companies.titleProperty;

  const response = await queryDatabase(companies, {
    page_size: 100,
    sorts: [{ property: titleProp, direction: "ascending" }],
  });

  return response.results
    .map((page) => ({
      id: page.id,
      name: getTitle(page.properties[titleProp]) || getTitle(page.properties["Name"]),
      ticker: getRichText(page.properties["Ticker"]) || null,
      sectors: getMultiSelect(page.properties["Sector"]),
      region: getSelect(page.properties["Region"]),
    }))
    .filter((company) => company.name.trim().length > 0);
}

export async function fetchSessions(companyId: string): Promise<Session[]> {
  const { earningsSessions } = requireDbIds();
  const companyProp = notionSchema.sessions.companyProperty;
  const normalizedCompanyId = normalizeNotionId(companyId);

  const response = await queryDatabase(earningsSessions, {
    page_size: 100,
    filter: {
      property: companyProp,
      relation: { contains: normalizedCompanyId },
    },
    sorts: [
      { property: notionSchema.sessions.titleProperty, direction: "descending" },
    ],
  });

  return response.results.map((page) => mapSession(page, companyId));
}

function requireDbIds(): { companies: string; earningsSessions: string } {
  const companies = process.env.COMPANIES_DATABASE_ID;
  const earningsSessions = process.env.EARNINGS_SESSIONS_DATABASE_ID;
  if (!companies || !earningsSessions) {
    throw new Error(
      "COMPANIES_DATABASE_ID and EARNINGS_SESSIONS_DATABASE_ID must be configured"
    );
  }
  return {
    companies: normalizeNotionId(companies),
    earningsSessions: normalizeNotionId(earningsSessions),
  };
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
    lastListenedTimestamp: getNumber(props[notionSchema.sessions.latestTimestampProperty]),
    audioDuration: null,
    lastViewedPage: getNumber(props[notionSchema.sessions.lastViewedPageProperty]),
    documentOrientation: getSelectOrStatus(
      props[notionSchema.sessions.documentOrientationProperty]
    ),
  };
}