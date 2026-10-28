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
  if (!env.DB) return json({ error: "Database is not configured. Bind the Webbon D1 database as DB." }, 503);
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) return json({ error: "Cross-origin request denied." }, 403);
  if (!(await verifyAccessJwt(request, env))) return json({ error: "Access denied. Sign in through the protected Webbon Cloudflare Access application." }, env.ACCESS_TEAM_DOMAIN && env.ACCESS_AUD ? 401 : 503);

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
