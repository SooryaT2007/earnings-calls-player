import { NextRequest, NextResponse } from "next/server";
import { getAuthConfig, SESSION_TTL_MS, SESSION_COOKIE } from "@/lib/auth-config";
import { secureEqual, createSessionToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const cfg = getAuthConfig();

  if (!cfg.enabled) {
    return NextResponse.json(
      { error: "Authentication is not enabled." },
      { status: 403 }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  const emailOk = await secureEqual(email, cfg.email);
  const passwordOk = await secureEqual(password, cfg.password);

  if (!emailOk || !passwordOk) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  const token = await createSessionToken(email);
  if (!token) {
    return NextResponse.json(
      { error: "Authentication is misconfigured (AUTH_SECRET must be at least 32 characters)." },
      { status: 500 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });

  return response;
}