import { getNotionClient } from "./notion-client";

export const URL_EXPIRY_MS = 50 * 60 * 1000;

type FilePropertyValue = {
  type: "files" | string;
  files?: Array<{
    name?: string;
    type?: string;
    file?: { url?: string; expiry_time?: string };
    external?: { url?: string };
  }>;
  url?: string;
  [key: string]: unknown;
};

/**
 * Retrieves the currently-valid (non-expired) URL for a file stored on a
 * page property. Notion-hosted files return S3/signed URLs that expire after
 * 60 minutes, so this re-fetches the page property to obtain a fresh URL.
 *
 * The page property can be either:
 *  - a Files & Media property (files[].file.url) - returned the same shape
 *    the property was stored with, or
 *  - a URL property that was resolved to a file URL.
 */
export async function getFreshFileUrl(
  pageId: string,
  propertyName: string
): Promise<string | null> {
  const notion = getNotionClient();

  const page = (await notion.pages.retrieve({
    page_id: pageId,
  })) as unknown as { properties: Record<string, FilePropertyValue> };

  const prop = page.properties?.[propertyName];
  if (!prop) return null;

  if (prop.type === "files" && Array.isArray(prop.files)) {
    const file = prop.files[0];
    if (file?.file?.url) return file.file.url;
    if (file?.external?.url) return file.external.url;
    return null;
  }

  if (typeof prop.url === "string" && prop.url.length > 0) {
    return prop.url;
  }

  return null;
}

/**
 * Convenience wrapper that fetches both the audio and PDF URLs for a session
 * page in a single round trip.
 */
export async function getSessionFileUrls(
  pageId: string,
  audioPropertyName: string,
  pdfPropertyName: string
): Promise<{ audioUrl: string | null; pdfUrl: string | null }> {
  const notion = getNotionClient();

  const page = (await notion.pages.retrieve({
    page_id: pageId,
  })) as unknown as { properties: Record<string, FilePropertyValue> };

  const props = page.properties;

  const resolve = (name: string): string | null => {
    const prop = props[name];
    if (!prop) return null;
    if (prop.type === "files" && Array.isArray(prop.files)) {
      const file = prop.files[0];
      if (file?.file?.url) return file.file.url;
      if (file?.external?.url) return file.external.url;
    }
    if (typeof prop.url === "string") return prop.url;
    return null;
  };

  return {
    audioUrl: resolve(audioPropertyName),
    pdfUrl: resolve(pdfPropertyName),
  };
}
