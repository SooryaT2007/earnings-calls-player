import { NextRequest, NextResponse } from "next/server";
import { getAuthConfig } from "@/lib/auth-config";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";

/**
 * Env-configured login gate. When AUTH_ENABLED is not truthy, every request
 * passes through untouched. When enabled, pages redirect to /login and API
 * routes return 401 unless the session cookie is valid. /login and the
 * /api/auth/* endpoints are always reachable.
 */
export async function middleware(request: NextRequest) {
  if (!getAuthConfig().enabled) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (pathname === "/api/auth/login" || pathname === "/api/auth/logout" || pathname === "/api/auth/status") {
    return NextResponse.next();
  }

  const isLoginPage = pathname === "/login";

  const token = request.cookies.get(SESSION_COOKIE)?.value ?? null;
  const session = await verifySessionToken(token);

  if (session) {
    if (isLoginPage) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (isLoginPage) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};