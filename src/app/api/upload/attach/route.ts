import { NextResponse } from "next/server";
import { createSessionInNotion } from "@/lib/notion-ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AttachBody = {
  companyId?: string;
  period?: string;
  title?: string;
  pdf?: { url: string; name: string } | null;
  audio?: { url: string; name: string } | null;
};

/**
 * Creates the Earnings Session page after the files have been uploaded
 * directly to Vercel Blob by the browser. The blob URLs are attached to the
 * session's Files & Media properties as external files.
 */
export async function POST(request: Request) {
  let body: AttachBody;
  try {
    body = (await request.json()) as AttachBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const companyId = body.companyId?.trim();
  const period = body.period?.trim();

  if (!companyId) {
    return NextResponse.json({ error: "Company is required." }, { status: 400 });
  }
  if (!period) {
    return NextResponse.json({ error: "Period is required." }, { status: 400 });
  }
  if (!body.pdf && !body.audio) {
    return NextResponse.json(
      { error: "At least one file (PDF or audio) is required." },
      { status: 400 }
    );
  }

  try {
    const result = await createSessionInNotion({
      companyId,
      period,
      title: body.title?.trim() || undefined,
      pdf: body.pdf
        ? { name: body.pdf.name, url: body.pdf.url }
        : undefined,
      audio: body.audio
        ? { name: body.audio.name, url: body.audio.url }
        : undefined,
    });

    return NextResponse.json({ success: true, pageId: result.pageId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unknown upload error occurred.";
    const status =
      (error as { status?: number })?.status &&
      (error as { status?: number }).status! >= 400 &&
      (error as { status?: number }).status! < 600
        ? (error as { status?: number }).status!
        : 500;

    console.error("Failed to create session:", error);
    return NextResponse.json({ error: message }, { status });
  }
}