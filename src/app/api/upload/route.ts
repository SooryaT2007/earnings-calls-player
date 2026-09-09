import { NextRequest, NextResponse } from "next/server";
import { createSessionInNotion } from "@/lib/notion-ingest";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import os from "os";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const maxDuration = 300;

const MAX_FILE_SIZE = 100 * 1024 * 1024;

type ParsedUpload = {
  companyId: string;
  period: string;
  title?: string;
  pdfFile?: { tmpPath: string; name: string; contentType: string; size: number };
  audioFile?: {
    tmpPath: string;
    name: string;
    contentType: string;
    size: number;
  };
};

/**
 * Reads a single form File from a multipart request and streams its contents
 * to a temporary file on disk, enforcing the 100MB cap while streaming.
 */
async function stashToTempFile(
  file: File,
  tmpDir: string
): Promise<{ tmpPath: string; name: string; contentType: string; size: number }> {
  const tmpPath = path.join(
    tmpDir,
    `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/[^\w.\-]/g, "_")}`
  );

  const writeStream = fsSync.createWriteStream(tmpPath);

  try {
    const reader = file.stream().getReader();
    const nodeStream = Readable.fromWeb(reader as never);

    let size = 0;

    const counting = new Readable({
      read() {},
    });

    nodeStream.on("data", (chunk: Buffer) => {
      size += chunk.byteLength;
      if (size > MAX_FILE_SIZE) {
        counting.destroy(new Error("File exceeds the 100MB upload limit."));
        nodeStream.destroy();
      } else {
        counting.push(chunk);
      }
    });
    nodeStream.on("end", () => counting.push(null));
    nodeStream.on("error", (err: Error) => counting.destroy(err));

    await pipeline(counting, writeStream);

    return {
      tmpPath,
      name: file.name,
      contentType: file.type || "application/octet-stream",
      size,
    };
  } catch (error) {
    writeStream.destroy();
    await fs.rm(tmpPath, { force: true });
    throw error;
  }
}

export async function POST(request: NextRequest) {
  // Pre-flight: reject oversized bodies before buffering them into memory.
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_FILE_SIZE * 1.02 + 4096) {
    return NextResponse.json(
      { error: "Upload exceeds the 100MB limit." },
      { status: 413 }
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch (error) {
    console.error("Failed to parse multipart form:", error);
    return NextResponse.json(
      { error: "Failed to parse upload. Send a multipart/form-data request." },
      { status: 400 }
    );
  }

  const companyId = String(formData.get("companyId") ?? "").trim();
  const period = String(formData.get("period") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim() || undefined;

  if (!companyId) {
    return NextResponse.json({ error: "Company is required." }, { status: 400 });
  }
  if (!period) {
    return NextResponse.json({ error: "Period is required." }, { status: 400 });
  }

  const pdfEntry = formData.get("pdf");
  const audioEntry = formData.get("audio");

  if (!pdfEntry && !audioEntry) {
    return NextResponse.json(
      { error: "At least one file (PDF or audio) is required." },
      { status: 400 }
    );
  }
  if (pdfEntry && !(pdfEntry instanceof File)) {
    return NextResponse.json(
      { error: "'pdf' must be a file upload." },
      { status: 400 }
    );
  }
  if (audioEntry && !(audioEntry instanceof File)) {
    return NextResponse.json(
      { error: "'audio' must be a file upload." },
      { status: 400 }
    );
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ecp-upload-"));

  try {
    const parsed: ParsedUpload = { companyId, period, title };

    if (pdfEntry instanceof File) {
      parsed.pdfFile = await stashToTempFile(pdfEntry, tmpDir);
    }
    if (audioEntry instanceof File) {
      parsed.audioFile = await stashToTempFile(audioEntry, tmpDir);
    }

    const result = await createSessionInNotion({
      companyId,
      period,
      title,
      pdf: parsed.pdfFile
        ? {
            name: parsed.pdfFile.name,
            contentType: parsed.pdfFile.contentType,
            buffer: new Uint8Array(await fs.readFile(parsed.pdfFile.tmpPath)),
          }
        : undefined,
      audio: parsed.audioFile
        ? {
            name: parsed.audioFile.name,
            contentType: parsed.audioFile.contentType,
            buffer: new Uint8Array(await fs.readFile(parsed.audioFile.tmpPath)),
          }
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

    console.error("Upload failed:", error);
    return NextResponse.json({ error: message }, { status });
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}