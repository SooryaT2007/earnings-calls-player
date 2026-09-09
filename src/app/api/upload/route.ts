import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "audio/*",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/vnd.wave",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/aac",
  "audio/x-aac",
  "audio/flac",
  "audio/x-flac",
  "audio/ogg",
  "audio/vorbis",
  "audio/opus",
  "audio/webm",
  "video/mp4",
  "video/webm",
];

/**
 * Token-exchange route for Vercel Blob client uploads. The browser calls
 * upload() from @vercel/blob/client which POSTs here to receive a scoped,
 * short-lived client token, then streams the file straight to Blob storage
 * with multipart chunking (bypassing the 4.5MB Vercel Functions payload limit).
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_CONTENT_TYPES,
        maximumSizeInBytes: MAX_FILE_SIZE,
        addRandomSuffix: true,
      }),
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}