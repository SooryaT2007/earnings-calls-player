import { getNotionClient } from "./notion-client";
import { notionSchema } from "./notion-config";
import { getSessionsDbSchema } from "./notion-db";

function numberValue(
  value: number | undefined
): number | undefined {
  return value === undefined ? undefined : Math.round(value);
}

/**
 * Updates the 'Latest Timestamp' (number) property on a session page.
 * Debounced from the client to stay well within Notion's 3 req/s limit.
 */
export async function updateSessionListenedTimestamp(
  pageId: string,
  timestampSeconds: number,
  propertyName: string = notionSchema.sessions.latestTimestampProperty
): Promise<void> {
  const notion = getNotionClient();

  await notion.pages.update({
    page_id: pageId,
    properties: {
      [propertyName]: {
        number: Math.round(timestampSeconds),
      },
    } as never,
  });
}

/**
 * Updates progress fields on a session page:
 *  - 'Latest Timestamp' (number)
 *  - 'Last Viewed Page' (number)
 *  - 'Document Orientation' (select/status), when the property exists
 */
export async function updateSessionProgress(
  pageId: string,
  {
    timestampSeconds,
    pdfPage,
    documentMode,
  }: {
    timestampSeconds?: number;
    pdfPage?: number;
    documentMode?: "horizontal" | "vertical";
  }
): Promise<void> {
  const notion = getNotionClient();
  const { latestTimestampProperty, lastViewedPageProperty, documentOrientationProperty } =
    notionSchema.sessions;

  const properties: Record<string, unknown> = {};
  const timestamp = numberValue(timestampSeconds);
  if (timestamp !== undefined) {
    properties[latestTimestampProperty] = { number: timestamp };
  }
  if (pdfPage !== undefined) {
    properties[lastViewedPageProperty] = { number: pdfPage };
  }
  if (documentMode) {
    properties[documentOrientationProperty] = await orientationValue(documentMode);
  }

  if (Object.keys(properties).length === 0) return;

  await notion.pages.update({
    page_id: pageId,
    properties: properties as never,
  });
}

/**
 * Renders a Document Orientation value using the property's actual type
 * (select or status). Falls back to a select write when the schema cannot
 * be determined.
 */
async function orientationValue(
  mode: "horizontal" | "vertical"
): Promise<{ select: { name: string } } | { status: { name: string } }> {
  const schema: Record<string, string> = await getSessionsDbSchema().catch(
    () => ({} as Record<string, string>)
  );
  const type = schema[notionSchema.sessions.documentOrientationProperty];
  if (type === "status") return { status: { name: mode } };
  return { select: { name: mode } };
}