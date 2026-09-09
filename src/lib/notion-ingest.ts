import { getNotionClient, getDatabaseIds } from "./notion-client";
import { uploadFileToNotion, attachFileToProperty } from "./notion-file-upload";
import { APIErrorCode } from "@notionhq/client";
import { notionSchema } from "./notion-config";

export type CreateSessionInput = {
  companyId: string;
  period: string;
  title?: string;
  pdf?: { name: string; contentType: string; buffer: Uint8Array };
  audio?: { name: string; contentType: string; buffer: Uint8Array };
};

/**
 * Creates a new Earnings Session page in the Notion database and uploads
 * the provided PDF and audio files to their respective Files & Media
 * properties.
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
            content:
              input.title ?? `${input.period} Earnings Call`,
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

  const page = await notion.pages.create({
    parent: { database_id: earningsSessions },
    properties: properties as never,
  });

  const pageId = page.id;

  try {
    if (input.pdf) {
      const id = await uploadFileToNotion(
        input.pdf.name,
        input.pdf.contentType,
        input.pdf.buffer
      );
      await attachFileToProperty(pageId, pdfProperty, id, input.pdf.name);
    }

    if (input.audio) {
      const id = await uploadFileToNotion(
        input.audio.name,
        input.audio.contentType,
        input.audio.buffer
      );
      await attachFileToProperty(pageId, audioProperty, id, input.audio.name);
    }
  } catch (error) {
    // Best-effort: if file attach fails, the page still exists with metadata.
    console.error("Failed to attach files to session page", error);
    // Re-throw so the caller can surface a real error; page may need cleanup.
    const notionError = error as { code?: string };
    if (notionError.code === APIErrorCode.ObjectNotFound) {
      throw new Error(
        `The Earnings Sessions database or a needed property was not found. Check that your schema matches: ${titleProperty} (title), ${companyProperty} (relation), ${pdfProperty} (files), ${audioProperty} (files).`
      );
    }
    throw error;
  }

  return { pageId };
}