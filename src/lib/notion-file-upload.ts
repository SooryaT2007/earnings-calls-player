import { getNotionClient } from "./notion-client";

export const MULTIPART_PART_SIZE = 20 * 1024 * 1024;
export const SINGLE_PART_MAX = 20 * 1024 * 1024;

export type FileUploadMode = "single_part" | "multi_part";

export class NotionFileUploadError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "NotionFileUploadError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Chunks a binary buffer into the parts Notion expects (5–20MB each, with
 * the final part allowed to be smaller).
 */
export function chunkBuffer(
  buffer: Uint8Array,
  partSize: number = MULTIPART_PART_SIZE
): Uint8Array[] {
  const parts: Uint8Array[] = [];
  for (let start = 0; start < buffer.length; start += partSize) {
    parts.push(buffer.slice(start, Math.min(start + partSize, buffer.length)));
  }
  return parts;
}

/**
 * Full single-part upload flow for files < 20MB.
 * Uses the Notion v1/file_uploads create + send lifecycle.
 * Returns the file_upload ID to attach to a page property.
 */
export async function uploadFileSinglePart(
  filename: string,
  contentType: string,
  buffer: Uint8Array
): Promise<string> {
  const notion = getNotionClient();

  const created = await notion.fileUploads.create({
    mode: "single_part",
    filename,
    content_type: contentType,
  });

  await notion.fileUploads.send({
    file_upload_id: created.id,
    file: {
      filename,
      data: new Blob([buffer as unknown as BlobPart], { type: contentType }),
    },
  });

  return created.id;
}

/**
 * Full multi-part upload flow for files between 20MB and ~100MB.
 * Splits the file into 20MB parts, sends each part (sequentially to respect
 * Notion's 3 req/s rate limit), then completes the upload.
 * Returns the file_upload ID to attach to a page property.
 */
export async function uploadFileMultiPart(
  filename: string,
  contentType: string,
  buffer: Uint8Array
): Promise<string> {
  const notion = getNotionClient();

  const parts = chunkBuffer(buffer);
  const totalParts = parts.length;

  const created = await notion.fileUploads.create({
    mode: "multi_part",
    filename,
    content_type: contentType,
    number_of_parts: totalParts,
  });

  for (let i = 0; i < totalParts; i++) {
    const part = parts[i];
    if (!part) continue;

    // 50ms sleep between parts to stay comfortably under the 3 req/s cap.
    if (i > 0) await new Promise((r) => setTimeout(r, 350));

    await notion.fileUploads.send({
      file_upload_id: created.id,
      file: {
        filename,
        data: new Blob([part as unknown as BlobPart], { type: contentType }),
      },
      part_number: String(i + 1),
    });
  }

  await notion.fileUploads.complete({
    file_upload_id: created.id,
  });

  return created.id;
}

/**
 * Dispatches to the correct upload flow based on file size.
 */
export async function uploadFileToNotion(
  filename: string,
  contentType: string,
  buffer: Uint8Array
): Promise<string> {
  if (buffer.length <= SINGLE_PART_MAX) {
    return uploadFileSinglePart(filename, contentType, buffer);
  }
  return uploadFileMultiPart(filename, contentType, buffer);
}

/**
 * Attaches an uploaded file (by file_upload ID) to a Files & Media property
 * on a database page, e.g. "Call Audio" or "Presentation".
 */
export async function attachFileToProperty(
  pageId: string,
  propertyName: string,
  fileUploadId: string,
  name?: string
): Promise<void> {
  const notion = getNotionClient();

  await notion.pages.update({
    page_id: pageId,
    properties: {
      [propertyName]: {
        files: [
          {
            name,
            type: "file_upload",
            file_upload: { id: fileUploadId },
          },
        ],
      },
    },
  });
}