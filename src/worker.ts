interface D1Result<T = Record<string, unknown>> {
  results?: T[];
  success: boolean;
  meta?: { changes?: number };
}
interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}
interface D1Database {
  prepare(query: string): D1Statement;
  batch<T = unknown>(statements: D1Statement[]): Promise<D1Result<T>[]>;
}
interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  DB?: D1Database;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  AUTH_SECRET?: string;
}

const noStore = { "Cache-Control": "no-store" };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: noStore });
const statusToDb: Record<string, string> = {
  "In progress": "in_progress",
  "Ready for review": "review",
  "Preview sent": "preview_sent",
  "Published": "published",
  "Needs information": "needs_information",
};
const statusFromDb: Record<string, string> = {
  in_progress: "In progress",
  review: "Ready for review",
  preview_sent: "Preview sent",
  published: "Published",
  needs_information: "Needs information",
  draft: "In progress",
};
const colors = ["mint", "peach", "lavender", "blue", "sand"];

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
function decodeJwtPart(value: string): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as Record<string, unknown>;
}
async function verifyAccessJwt(request: Request, env: Env): Promise<boolean> {
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return false;
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const header = decodeJwtPart(parts[0]);
    const claims = decodeJwtPart(parts[1]);
    if (header.alg !== "RS256" || typeof header.kid !== "string") return false;
    const domain = env.ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const issuer = "https://" + domain;
    const now = Math.floor(Date.now() / 1000);
    const aud = claims.aud;
    if (claims.iss !== issuer || typeof claims.exp !== "number" || claims.exp <= now) return false;
    if (typeof claims.nbf === "number" && claims.nbf > now) return false;
    if (!(aud === env.ACCESS_AUD || (Array.isArray(aud) && aud.includes(env.ACCESS_AUD)))) return false;
    const certResponse = await fetch(issuer + "/cdn-cgi/access/certs", { cf: { cacheTtl: 300, cacheEverything: true } } as RequestInit);
    if (!certResponse.ok) return false;
    const certs = await certResponse.json() as { keys?: Array<JsonWebKey & { kid?: string }> };
    const jwk = certs.keys?.find((key) => key.kid === header.kid);
    if (!jwk) return false;
    const publicKey = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    return crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, decodeBase64Url(parts[2]).buffer as ArrayBuffer, new TextEncoder().encode(parts[0] + "." + parts[1]));
  } catch {
    return false;
  }
}


function encodeBase64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").split("+").join("-").split("/").join("_");
}
async function signSession(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return encodeBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))));
}
async function sessionEmail(request: Request, env: Env): Promise<string | null> {
  if (!env.AUTH_SECRET) return null;
  const cookie = request.headers.get("Cookie") ?? "";
  const token = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("webbon_session="))?.slice("webbon_session=".length);
  if (!token) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  try {
    const expected = await signSession(payload, env.AUTH_SECRET);
    if (signature !== expected) return null;
    const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload))) as { email?: unknown; exp?: unknown };
    if (typeof claims.email !== "string" || typeof claims.exp !== "number" || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    if (!env.ADMIN_EMAIL || claims.email.toLowerCase() !== env.ADMIN_EMAIL.toLowerCase()) return null;
    return claims.email;
  } catch { return null; }
}
async function constantTimeEqual(a: string, b: string): Promise<boolean> {
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(a)),
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(b)),
  ]);
  const x = new Uint8Array(left), y = new Uint8Array(right);
  let difference = 0;
  for (let i = 0; i < x.length; i++) difference |= x[i] ^ y[i];
  return difference === 0;
}

function projectFromRow(row: Record<string, unknown>, index = 0) {
  const name = String(row.business ?? "");
  const statusKey = String(row.status ?? "in_progress");
  return {
    id: Number(row.id),
    business: name,
    category: String(row.category ?? "Other"),
    location: String(row.location ?? "") || "Location not added",
    owner: String(row.assigned_to ?? "") || "Unassigned",
    initials: name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase(),
    color: colors[index % colors.length],
    status: statusFromDb[statusKey] ?? "In progress",
    updated: String(row.updated_at ?? ""),
    pages: 1,
    notes: String(row.notes ?? ""),
  };
}
async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  } catch { return null; }
}
function cleanString(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/api/health" && request.method === "GET") {
    return json({ ok: true, service: "webbon", databaseConfigured: Boolean(env.DB), accessConfigured: Boolean(env.ACCESS_TEAM_DOMAIN && env.ACCESS_AUD), timestamp: new Date().toISOString() });
  }
  if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) return json({ error: "Cross-origin request denied." }, 403);

  if (url.pathname === "/api/auth/login" && request.method === "POST") {
    if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD || !env.AUTH_SECRET) return json({ error: "Login is not configured. Add ADMIN_EMAIL, ADMIN_PASSWORD, and AUTH_SECRET as Worker secrets." }, 503);
    const body = await readJson(request);
    const email = cleanString(body?.email, 254).toLowerCase();
    const password = typeof body?.password === "string" ? body.password : "";
    if (!(await constantTimeEqual(email, env.ADMIN_EMAIL.toLowerCase())) || !(await constantTimeEqual(password, env.ADMIN_PASSWORD))) {
      return json({ error: "Email or password is incorrect." }, 401);
    }
    const payload = encodeBase64Url(new TextEncoder().encode(JSON.stringify({ email: env.ADMIN_EMAIL.toLowerCase(), exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 })));
    const token = payload + "." + await signSession(payload, env.AUTH_SECRET);
    return new Response(JSON.stringify({ ok: true, email: env.ADMIN_EMAIL }), { status: 200, headers: { ...noStore, "Content-Type": "application/json", "Set-Cookie": "webbon_session=" + token + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800" } });
  }
  if (url.pathname === "/api/auth/logout" && request.method === "POST") {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...noStore, "Content-Type": "application/json", "Set-Cookie": "webbon_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" } });
  }
  if (url.pathname === "/api/auth/me" && request.method === "GET") {
    const email = await sessionEmail(request, env);
    return email ? json({ authenticated: true, email }) : json({ authenticated: false }, 401);
  }
  if (!(await sessionEmail(request, env))) return json({ error: "Please sign in to Webbon." }, 401);
  if (!env.DB) return json({ error: "Database is not configured. Bind the Webbon D1 database as DB." }, 503);

  if (url.pathname === "/api/projects" && request.method === "GET") {
    const result = await env.DB.prepare(`SELECT b.id, b.name AS business, b.category, b.location, b.notes, w.status, w.assigned_to, w.updated_at
      FROM businesses b INNER JOIN websites w ON w.business_id = b.id
      ORDER BY w.updated_at DESC LIMIT 500`).all<Record<string, unknown>>();
    return json({ projects: (result.results ?? []).map(projectFromRow) });
  }

  if (url.pathname === "/api/projects" && request.method === "POST") {
    const body = await readJson(request);
    const business = cleanString(body?.business, 160);
    const category = cleanString(body?.category, 80) || "Other";
    const location = cleanString(body?.location, 180);
    const owner = cleanString(body?.owner, 120);
    const notes = cleanString(body?.notes, 4000);
    if (!business) return json({ error: "Business name is required." }, 400);
    const id = String(Date.now());
    await env.DB.batch([
      env.DB.prepare("INSERT INTO businesses (id, name, category, location, notes) VALUES (?, ?, ?, ?, ?)").bind(id, business, category, location, notes),
      env.DB.prepare("INSERT INTO websites (id, business_id, name, status, template_key, assigned_to, content_json) VALUES (?, ?, ?, 'in_progress', 'studio', ?, '{}')").bind(id, id, business, owner),
      env.DB.prepare("INSERT INTO activity_log (id, website_id, action, actor, details_json) VALUES (?, ?, 'project_created', ?, ?)").bind(crypto.randomUUID(), id, owner || "staff", JSON.stringify({ business, category })),
    ]);
    const row = await env.DB.prepare(`SELECT b.id, b.name AS business, b.category, b.location, b.notes, w.status, w.assigned_to, w.updated_at
      FROM businesses b INNER JOIN websites w ON w.business_id = b.id WHERE b.id = ?`).bind(id).first<Record<string, unknown>>();
    return json({ project: row ? projectFromRow(row) : null }, 201);
  }

  const projectMatch = url.pathname.match(/^\/api\/projects\/(\d+)$/);
  if (projectMatch && request.method === "PATCH") {
    const id = projectMatch[1];
    const body = await readJson(request);
    const status = cleanString(body?.status, 40);
    const owner = body && Object.prototype.hasOwnProperty.call(body, "owner") ? cleanString(body.owner, 120) : null;
    const dbStatus = statusToDb[status];
    if (body && Object.prototype.hasOwnProperty.call(body, "status") && !dbStatus) return json({ error: "Invalid project status." }, 400);
    if (!dbStatus && owner === null) return json({ error: "No supported fields supplied." }, 400);
    const statements: D1Statement[] = [];
    if (dbStatus) statements.push(env.DB.prepare("UPDATE websites SET status = ?, updated_at = datetime('now') WHERE id = ?").bind(dbStatus, id));
    if (owner !== null) statements.push(env.DB.prepare("UPDATE websites SET assigned_to = ?, updated_at = datetime('now') WHERE id = ?").bind(owner, id));
    await env.DB.batch(statements);
    const row = await env.DB.prepare(`SELECT b.id, b.name AS business, b.category, b.location, b.notes, w.status, w.assigned_to, w.updated_at
      FROM businesses b INNER JOIN websites w ON w.business_id = b.id WHERE b.id = ?`).bind(id).first<Record<string, unknown>>();
    if (!row) return json({ error: "Project not found." }, 404);
    return json({ project: projectFromRow(row) });
  }

  const siteMatch = url.pathname.match(/^\/api\/sites\/(\d+)$/);
  if (siteMatch && request.method === "GET") {
    const row = await env.DB.prepare("SELECT id, name, template_key, content_json, preview_url, production_url, updated_at FROM websites WHERE id = ?").bind(siteMatch[1]).first<Record<string, unknown>>();
    if (!row) return json({ error: "Website not found." }, 404);
    let content: unknown = {};
    try { content = JSON.parse(String(row.content_json ?? "{}")); } catch { content = {}; }
    return json({ site: { ...row, content } });
  }
  if (siteMatch && request.method === "PUT") {
    const body = await readJson(request);
    if (!body || !body.site || typeof body.site !== "object" || Array.isArray(body.site)) return json({ error: "A site object is required." }, 400);
    const site = body.site as Record<string, unknown>;
    if (String(site.id) !== siteMatch[1]) return json({ error: "Website ID mismatch." }, 400);
    const name = cleanString(site.title ?? site.business, 160);
    if (!name) return json({ error: "Website name is required." }, 400);
    const content = JSON.stringify(site);
    if (content.length > 500_000) return json({ error: "Website content exceeds the 500 KB limit." }, 413);
    const result = await env.DB.prepare("UPDATE websites SET name = ?, template_key = ?, content_json = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(name, cleanString(site.template, 40) || "studio", content, siteMatch[1]).run();
    if (!result.meta?.changes) return json({ error: "Website not found." }, 404);
    await env.DB.prepare("INSERT INTO website_versions (id, website_id, version_number, content_json, created_by) SELECT ?, ?, COALESCE(MAX(version_number), 0) + 1, ?, 'access-user' FROM website_versions WHERE website_id = ?")
      .bind(crypto.randomUUID(), siteMatch[1], content, siteMatch[1]).run();
    return json({ ok: true, savedAt: new Date().toISOString() });
  }

  return json({ error: "API route not found." }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handleApi(request, env);
    } catch (error) {
      console.error("Webbon request failed", error);
      return json({ error: "The request could not be completed. Check Worker logs for details." }, 500);
    }
  },
};
