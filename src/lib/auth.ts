import { SESSION_COOKIE, SESSION_TTL_MS, getAuthConfig } from "./auth-config";

export { SESSION_COOKIE, SESSION_TTL_MS };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

type SessionPayload = {
  email: string;
  exp: number;
};

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const bin = atob(padded);
    const bytes = new Uint8Array(new ArrayBuffer(bin.length));
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function getSecretKey(): Promise<CryptoKey | null> {
  const secret = getAuthConfig().secret;
  if (!secret || secret.length < 32) return null;
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export type Session = {
  email: string;
  exp: number;
};

/**
 * Signs a session token (base64url(payload).base64url(hmac)).
 * Returns null when auth is misconfigured (missing/short AUTH_SECRET).
 */
export async function createSessionToken(email: string): Promise<string | null> {
  const key = await getSecretKey();
  if (!key) return null;

  const payload: SessionPayload = { email, exp: Date.now() + SESSION_TTL_MS };
  const encoded = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(encoded)));

  return `${encoded}.${toBase64Url(sig)}`;
}

/**
 * Validates the token signature and expiry. Returns the session payload or
 * null when invalid/expired/misconfigured.
 */
export async function verifySessionToken(
  token: string | null | undefined
): Promise<Session | null> {
  if (!token) return null;

  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) return null;

  const key = await getSecretKey();
  if (!key) return null;

  const expectedSig = fromBase64Url(sigB64);
  if (!expectedSig) return null;

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    expectedSig,
    encoder.encode(payloadB64)
  );
  if (!valid) return null;

  const payloadBytes = fromBase64Url(payloadB64);
  if (!payloadBytes) return null;

  try {
    const payload = JSON.parse(decoder.decode(payloadBytes)) as SessionPayload;
    if (!payload.email || typeof payload.exp !== "number") return null;
    if (payload.exp < Date.now()) return null;
    return { email: payload.email, exp: payload.exp };
  } catch {
    return null;
  }
}

/**
 * Constant-time string comparison (via HMAC) to avoid timing side channels
 * when checking credentials.
 */
export async function secureEqual(a: string, b: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode("ecp-constant-time-compare"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const [ha, hb] = await Promise.all([
    crypto.subtle.sign("HMAC", key, encoder.encode(a)),
    crypto.subtle.sign("HMAC", key, encoder.encode(b)),
  ]);

  const bufA = new Uint8Array(ha);
  const bufB = new Uint8Array(hb);
  if (bufA.length !== bufB.length) return false;

  let diff = 0;
  for (let i = 0; i < bufA.length; i++) {
    diff |= bufA[i] ^ bufB[i];
  }
  return diff === 0;
}