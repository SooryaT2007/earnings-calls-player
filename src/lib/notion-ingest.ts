import { getNotionClient, getDatabaseIds } from "./notion-client";
import { APIErrorCode } from "@notionhq/client";
import { notionSchema } from "./notion-config";

export type CreateSessionInput = {
  companyId: string;
  period: string;
  title?: string;
  pdf?: { name: string; url: string };
  audio?: { name: string; url: string };
};

function fileProperty(file: { name: string; url: string }) {
  return {
    files: [{ name: file.name, type: "external", external: { url: file.url } }],
  };
}

/**
 * Creates a new Earnings Session page in the Notion database and attaches
 * the given PDF and audio URLs (e.g. Vercel Blob uploads) to their
 * respective Files & Media properties as external files.
 *
 * Property names come from notionSchema (defaults to the "Companies
 * Research" workspace schema) and can be overridden via environment
 * variables.
 */
export async function createSessionInNotion(
  input: CreateSessionInput
): Promise<{ pageId: string }> {
  const notion = getNotionClient();
  const { earningsSessions } = getDatabaseIds();

  const {
    titleProperty,
    companyProperty,
    periodProperty,
    pdfProperty,
    audioProperty,
  } = notionSchema.sessions;

  const properties: Record<string, unknown> = {
    [titleProperty]: {
      title: [
        {
          text: {
            content: input.title ?? `${input.period} Earnings Call`,
          },
        },
      ],
    },
    [companyProperty]: {
      relation: [{ id: input.companyId }],
    },
  };

  if (periodProperty) {
    properties[periodProperty] = {
      rich_text: [{ text: { content: input.period } }],
    };
  }

  if (input.pdf) {
    properties[pdfProperty] = fileProperty(input.pdf);
  }

  if (input.audio) {
    properties[audioProperty] = fileProperty(input.audio);
  }

  try {
    const page = await notion.pages.create({
      parent: { database_id: earningsSessions },
      properties: properties as never,
    });

    return { pageId: page.id };
  } catch (error) {
    console.error("Failed to create session page", error);
    const notionError = error as { code?: string };
    if (notionError.code === APIErrorCode.ObjectNotFound) {
      throw new Error(
        `The Earnings Sessions database or a needed property was not found. Check that your schema matches: ${titleProperty} (title), ${companyProperty} (relation), ${pdfProperty} (files), ${audioProperty} (files).`
      );
    }
    throw error;
  }
}