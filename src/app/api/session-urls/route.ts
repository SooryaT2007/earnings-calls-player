import { NextRequest, NextResponse } from "next/server";
import { getSessionFileUrls } from "@/lib/notion-file-url";
import { notionSchema } from "@/lib/notion-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const pageId = request.nextUrl.searchParams.get("pageId");
  if (!pageId) {
    return NextResponse.json(
      { error: "pageId query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const urls = await getSessionFileUrls(
      pageId,
      notionSchema.sessions.audioProperty,
      notionSchema.sessions.pdfProperty
    );
    return NextResponse.json({
      audioUrl: urls.audioUrl,
      pdfUrl: urls.pdfUrl,
      fetchedAt: Date.now(),
    });
  } catch (error) {
    console.error("Failed to refresh session URLs:", error);
    const message =
      error instanceof Error ? error.message : "Failed to refresh file URLs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}