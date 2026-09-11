import { NextResponse } from "next/server";
import { fetchCompanies } from "@/lib/notion-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const companies = await fetchCompanies();
    return NextResponse.json(companies);
  } catch (error) {
    console.error("Failed to fetch companies:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch companies";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}