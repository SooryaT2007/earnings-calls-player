export const SESSION_COOKIE = "ecp_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type AuthConfig = {
  enabled: boolean;
  email: string;
  password: string;
  secret: string;
};

/**
 * Reads the env-configured credentials for the simple login gate.
 * Auth is off by default; set AUTH_ENABLED=true plus AUTH_EMAIL,
 * AUTH_PASSWORD and AUTH_SECRET (>= 32 chars) to turn it on.
 * Safe to import from both Edge middleware and Node route handlers.
 */
export function getAuthConfig(): AuthConfig {
  return {
    enabled: ["true", "1", "yes", "on"].includes(
      (process.env.AUTH_ENABLED ?? "false").toLowerCase()
    ),
    email: (process.env.AUTH_EMAIL ?? "").trim().toLowerCase(),
    password: process.env.AUTH_PASSWORD ?? "",
    secret: process.env.AUTH_SECRET ?? "",
  };
}