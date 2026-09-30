import { createClient } from "npm:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@6";

const PROJECT = "edunexus-live-e0b84";
const ADMIN_EMAIL = "veducator4@gmail.com";
// Supabase project (post-migration issuer).
const SUPABASE_PROJECT_URL = "https://cprpndovdfnkvekewstv.supabase.co";
const BUCKET = "edunexus-public-files";
const MAX_SIZE = 45 * 1024 * 1024;
const ALLOWED_ORIGINS = new Set(["https://edunexus.dpdns.org", "https://edunexus-app.vercel.app", "http://localhost:3000"]);
const MIME = new Map(Object.entries({
  pdf: "application/pdf", doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain", csv: "text/csv", jpg: "image/jpeg",
  jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  zip: "application/zip",
}));
const GOOGLE_KEYS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));
// Supabase Auth signs access tokens with the project's asymmetric key
// (ES256); verify against the published JWKS. The legacy HS256 JWT secret
// is kept only as a fallback for older tokens.
const SUPABASE_KEYS = createRemoteJWKSet(new URL(SUPABASE_PROJECT_URL + "/auth/v1/.well-known/jwks.json"));

const headers = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Vary": "Origin",
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
});
const response = (origin: string, status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: headers(origin) });

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin") || "";
  if (!ALLOWED_ORIGINS.has(origin)) return new Response("Origin not allowed", { status: 403 });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
  if (request.method !== "POST") return response(origin, 405, { error: "Method not allowed" });

  const bearer = request.headers.get("authorization") || "";
  if (!bearer.startsWith("Bearer ")) return response(origin, 401, { error: "Sign in to EduNexus as the verified administrator." });
  let userId = "";
  const token = bearer.slice(7);
  // Primary: verify the Supabase access token (JWKS, ES256).
  // Fallback 1: legacy HS256 JWT secret (if configured).
  // Fallback 2: Firebase ID token (Google JWKS) — kept during the
  // Firebase -> Supabase transition so both backends keep working.
  const checkSupabaseClaims = (payload: { [k: string]: unknown }): boolean => {
    const iss = String(payload.iss || "");
    const issOk = iss.includes("supabase.co") || iss === SUPABASE_PROJECT_URL ||
      iss === SUPABASE_PROJECT_URL + "/auth/v1";
    const audOk = payload.aud === "authenticated" ||
      (Array.isArray(payload.aud) && payload.aud.includes("authenticated"));
    const meta = (payload.user_metadata ?? {}) as { is_admin?: unknown };
    const isAdmin = meta.is_admin === true || payload.email === ADMIN_EMAIL;
    if (!issOk || !audOk || !payload.sub) throw new Error("Invalid Supabase token claims");
    return isAdmin === true;
  };
  let authenticated = false;
  try {
    const { payload } = await jwtVerify(token, SUPABASE_KEYS, {
      issuer: SUPABASE_PROJECT_URL + "/auth/v1",
    });
    if (!checkSupabaseClaims(payload)) {
      return response(origin, 403, { error: "Only the verified EduNexus administrator may upload." });
    }
    userId = String(payload.sub);
    authenticated = true;
  } catch {
    // JWKS verification failed -> try the legacy HS256 secret, then Firebase.
    const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET");
    if (jwtSecret) {
      try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret), {
          algorithms: ["HS256"],
        });
        if (!checkSupabaseClaims(payload)) {
          return response(origin, 403, { error: "Only the verified EduNexus administrator may upload." });
        }
        userId = String(payload.sub);
        authenticated = true;
      } catch {
        // Fall through to the Firebase path.
      }
    }
  }
  if (!authenticated) {
    try {
      const { payload } = await jwtVerify(token, GOOGLE_KEYS, {
        issuer: "https://securetoken.google.com/" + PROJECT,
        audience: PROJECT,
        algorithms: ["RS256"],
      });
      if (payload.email !== ADMIN_EMAIL || payload.email_verified !== true || !payload.sub ||
          payload.sub !== payload.user_id || payload.firebase == null) {
        return response(origin, 403, { error: "Only the verified EduNexus administrator may upload." });
      }
      userId = String(payload.sub);
    } catch {
      return response(origin, 401, { error: "Your Firebase session could not be verified. Sign in again." });
    }
  }

  let incoming: { filename?: unknown; size?: unknown; contentType?: unknown };
  try { incoming = await request.json(); } catch { return response(origin, 400, { error: "Invalid upload request." }); }
  const original = String(incoming.filename || "").slice(0, 180);
  const ext = original.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase() || "";
  const size = Number(incoming.size);
  if (!MIME.has(ext) || !Number.isInteger(size) || size <= 0 || size > MAX_SIZE) {
    return response(origin, 400, { error: "Choose a supported file under 45 MiB. Larger files can be shared through Google Drive." });
  }
  const allowedMime = MIME.get(ext)!;
  const providedMime = String(incoming.contentType || "");
  if (providedMime && providedMime !== allowedMime &&
      !(providedMime === "application/octet-stream" && ["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(ext))) {
    return response(origin, 400, { error: "File type does not match its extension." });
  }

  const safeName = original.normalize("NFKD").replace(/[^A-Za-z0-9._-]/g, "_").slice(-105);
  const path = userId + "/" + crypto.randomUUID() + "/" + safeName;
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return response(origin, 503, { error: "Storage service is not configured." });

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data?.token || !data?.signedUrl) {
    console.error("Create signed upload failed:", error?.message);
    return response(origin, 503, { error: "Could not authorize this upload. Try again later." });
  }
  // A signed object-upload token is a compact JWS. Do not hand malformed
  // authorization data to a browser or log/return the token on failure.
  if (data.token.split(".").length !== 3) {
    console.error("Storage returned a malformed signed-upload token");
    return response(origin, 503, { error: "Storage authorization is misconfigured. Contact EduNexus support." });
  }
  const signedUrl = new URL(data.signedUrl);
  if (signedUrl.origin !== new URL(supabaseUrl).origin ||
      !signedUrl.pathname.includes("/storage/v1/object/upload/sign/" + BUCKET + "/") ||
      signedUrl.searchParams.get("token") !== data.token) {
    console.error("Storage returned an unexpected signed-upload destination");
    return response(origin, 503, { error: "Upload destination verification failed." });
  }
  return response(origin, 200, {
    path, token: data.token, uploadUrl: signedUrl.toString(), contentType: allowedMime,
    limit: MAX_SIZE, bucket: BUCKET,
  });
});
