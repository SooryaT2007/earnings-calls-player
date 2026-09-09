import { NextRequest, NextResponse } from "next/server";
import { updateSessionProgress } from "@/lib/notion-session";
import { notionRateLimiter, withRetry } from "@/lib/rate-limiter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: {
    pageId?: string;
    timestampSeconds?: number;
    pdfPage?: number;
    documentMode?: "horizontal" | "vertical";
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.pageId) {
    return NextResponse.json(
      { error: "pageId is required" },
      { status: 400 }
    );
  }

  try {
    await notionRateLimiter.enqueue(() =>
      withRetry(() =>
        updateSessionProgress(body.pageId!, {
          timestampSeconds: body.timestampSeconds,
          pdfPage: body.pdfPage,
          documentMode: body.documentMode,
        })
      )
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save session progress:", error);
    return NextResponse.json(
      { error: "Failed to save session progress" },
      { status: 500 }
    );
  }
}