import { issueSignedToken } from "@vercel/blob";
import {
  handleUploadPresigned,
  type HandleUploadPresignedBody,
} from "@vercel/blob/client";
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
 * Token/URL-exchange route for Vercel Blob presigned client uploads.
 * Uses OIDC (BLOB_STORE_ID) and BLOB_WEBHOOK_PUBLIC_KEY with presigned URLs,
 * allowing browser-to-Blob streaming and multipart chunking for large files.
 */
export async function POST(request: Request) {
  let body: HandleUploadPresignedBody;
  try {
    body = (await request.json()) as HandleUploadPresignedBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUploadPresigned({
      body,
      request,
      getSignedToken: async () => {
        const token = await issueSignedToken({
          operations: ["put"],
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_FILE_SIZE,
        });

        return {
          token,
          urlOptions: {
            allowedContentTypes: ALLOWED_CONTENT_TYPES,
            maximumSizeInBytes: MAX_FILE_SIZE,
            addRandomSuffix: true,
          },
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Presigned upload error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}