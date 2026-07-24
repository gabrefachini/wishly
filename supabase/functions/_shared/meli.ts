import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_RETURN_ORIGINS = new Set([
  "https://www.wishlyapp.com.br",
  "https://wishlyapp.com.br",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  "http://127.0.0.1:5176",
  "http://127.0.0.1:5177",
  "http://127.0.0.1:5178",
  "http://127.0.0.1:5179",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:5177",
  "http://localhost:5178",
  "http://localhost:5179",
]);

const textEncoder = new TextEncoder();

export type MercadoLivreOauthState = {
  sub: string;
  returnTo: string;
  nonce: string;
  iat: number;
};

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const binary = atob(`${normalized}${padding}`);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmacSha256(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(value));
  return toBase64Url(new Uint8Array(signature));
}

export function buildCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_RETURN_ORIGINS.has(origin)
    ? origin
    : "https://www.wishlyapp.com.br";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
  };
}

export function buildJsonResponse(request: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(request.headers.get("Origin")),
      "Content-Type": "application/json",
    },
  });
}

export function getRequiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`missing_env:${name}`);
  return value;
}

export function getOptionalEnv(name: string) {
  return Deno.env.get(name)?.trim() || null;
}

export function getDefaultReturnTo() {
  return getOptionalEnv("MELI_OAUTH_DEFAULT_RETURN_URL") ?? "https://www.wishlyapp.com.br/";
}

export function sanitizeReturnTo(input: string | null | undefined) {
  const fallback = getDefaultReturnTo();
  if (!input) return fallback;

  try {
    const parsed = new URL(input);
    if (!ALLOWED_RETURN_ORIGINS.has(parsed.origin)) return fallback;
    return parsed.toString();
  } catch {
    return fallback;
  }
}

export async function createOauthState(input: { userId: string; returnTo?: string | null }) {
  const secret = getRequiredEnv("MELI_OAUTH_STATE_SECRET");
  const payload: MercadoLivreOauthState = {
    sub: input.userId,
    returnTo: sanitizeReturnTo(input.returnTo),
    nonce: crypto.randomUUID(),
    iat: Math.floor(Date.now() / 1000),
  };
  const payloadEncoded = toBase64Url(textEncoder.encode(JSON.stringify(payload)));
  const signature = await hmacSha256(secret, payloadEncoded);
  return `${payloadEncoded}.${signature}`;
}

export async function verifyOauthState(value: string | null, maxAgeSeconds = 900) {
  if (!value || !value.includes(".")) throw new Error("invalid_state");

  const [payloadEncoded, signature] = value.split(".", 2);
  const secret = getRequiredEnv("MELI_OAUTH_STATE_SECRET");
  const expectedSignature = await hmacSha256(secret, payloadEncoded);

  if (signature !== expectedSignature) throw new Error("invalid_state_signature");

  const payloadJson = new TextDecoder().decode(fromBase64Url(payloadEncoded));
  const payload = JSON.parse(payloadJson) as MercadoLivreOauthState;
  if (!payload?.sub || !payload?.iat) throw new Error("invalid_state_payload");

  const now = Math.floor(Date.now() / 1000);
  if (now - payload.iat > maxAgeSeconds) throw new Error("expired_state");

  return {
    ...payload,
    returnTo: sanitizeReturnTo(payload.returnTo),
  };
}

export function createServiceRoleClient() {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function buildMercadoLivreAuthorizeUrl(input: {
  appId: string;
  redirectUri: string;
  state: string;
}) {
  const url = new URL("https://auth.mercadolivre.com.br/authorization");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", input.appId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("state", input.state);
  return url.toString();
}

export async function exchangeMercadoLivreCodeForToken(input: {
  code: string;
  appId: string;
  clientSecret: string;
  redirectUri: string;
}) {
  const response = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: input.appId,
      client_secret: input.clientSecret,
      code: input.code,
      redirect_uri: input.redirectUri,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const errorCode = typeof payload?.error === "string" ? payload.error : `meli_token_http_${response.status}`;
    throw new Error(errorCode);
  }

  return payload as {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    user_id: number;
    refresh_token: string;
  };
}

export function buildOauthCompletionRedirect(input: {
  returnTo: string;
  status: "success" | "error";
  code?: string;
}) {
  const url = new URL(input.returnTo);
  url.searchParams.set("meli_oauth", input.status);
  if (input.code) url.searchParams.set("meli_code", input.code);
  return url.toString();
}
