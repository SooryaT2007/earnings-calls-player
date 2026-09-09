"use server";

import { getFreshFileUrl } from "@/lib/notion-file-url";
import { updateSessionListenedTimestamp } from "@/lib/notion-session";
import { notionRateLimiter, withRetry } from "@/lib/rate-limiter";
import { notionSchema } from "@/lib/notion-config";

export type FreshFileUrls = {
  audioUrl: string | null;
  pdfUrl: string | null;
  fetchedAt: number;
};

/**
 * Re-fetches a Notion page's Audio / PDF properties and returns fresh,
 * unexpired S3 URLs. Notion-hosted URLs expire after 60 minutes; the client
 * calls this (proactively before expiry or on a 403) so the players can
 * silently swap in a fresh URL without losing playback position.
 */
export async function refreshFileUrls(
  pageId: string,
  audioProperty: string = notionSchema.sessions.audioProperty,
  pdfProperty: string = notionSchema.sessions.pdfProperty
): Promise<FreshFileUrls> {
  const [audioUrl, pdfUrl] = await Promise.all([
    notionRateLimiter.enqueue(() =>
      withRetry(() => getFreshFileUrl(pageId, audioProperty))
    ),
    notionRateLimiter.enqueue(() =>
      withRetry(() => getFreshFileUrl(pageId, pdfProperty))
    ),
  ]);

  return { audioUrl, pdfUrl, fetchedAt: Date.now() };
}

/**
 * Persists the user's "last listened" timestamp back to Notion.
 * Called on session unload / every ~30s while playing, guarded by the client
 * so we stay well within Notion's 3 requests/second limit.
 */
export async function writeLastListenedTimestamp(
  pageId: string,
  timestampSeconds: number,
  propertyName: string = notionSchema.sessions.latestTimestampProperty
): Promise<void> {
  await notionRateLimiter.enqueue(() =>
    withRetry(() =>
      updateSessionListenedTimestamp(pageId, timestampSeconds, propertyName)
    )
  );
}