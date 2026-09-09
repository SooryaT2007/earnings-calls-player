import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-config";
import { verifySessionToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value ?? null;
  const session = await verifySessionToken(token);

  return NextResponse.json({
    authenticated: session !== null,
    email: session?.email ?? null,
  });
}