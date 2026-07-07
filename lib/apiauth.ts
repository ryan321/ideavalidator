import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  getApiKeyByHash,
  getIdeaOwned,
  getVersion,
  touchApiKey,
  type ApiKey,
  type Idea,
} from "./db";

// Bearer API-key auth + tenancy for the public /api/v1 surface. Keys look like
// `iv_live_<40 hex>`; only their sha256 hash is ever stored. Each key owns the ideas it
// creates, so one agent can never read or spend against another's campaigns.

const KEY_PREFIX = "iv_live_";

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const secret = crypto.randomBytes(20).toString("hex"); // 40 hex chars
  const raw = `${KEY_PREFIX}${secret}`;
  return { raw, hash: hashKey(raw), prefix: raw.slice(0, KEY_PREFIX.length + 4) };
}

export function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw.trim()).digest("hex");
}

export type AuthOk = { ok: true; key: ApiKey };
export type AuthErr = { ok: false; response: NextResponse };

/** Authenticate a request by its Authorization: Bearer header. */
export function authenticate(req: Request): AuthOk | AuthErr {
  const header = req.headers.get("authorization") ?? "";
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return unauthorized("Provide your key as `Authorization: Bearer iv_live_…`.");
  const key = getApiKeyByHash(hashKey(m[1]));
  if (!key || key.revoked) return unauthorized("Invalid or revoked API key.");
  touchApiKey(key.id);
  return { ok: true, key };
}

function unauthorized(message: string): AuthErr {
  return { ok: false, response: NextResponse.json({ error: { type: "unauthorized", message } }, { status: 401 }) };
}

export function apiError(type: string, message: string, status: number, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ error: { type, message, ...extra } }, { status });
}

/** Resolve an idea the caller owns, or a 404 (never reveal another tenant's ideas). */
export function requireOwnedIdea(key: ApiKey, ideaId: string): { idea: Idea } | { response: NextResponse } {
  const idea = getIdeaOwned(ideaId, key.id);
  if (!idea) return { response: apiError("not_found", "No such idea for this key.", 404) };
  return { idea };
}

/** Resolve a version the caller owns (via its idea), or a 404. */
export function requireOwnedVersion(key: ApiKey, versionId: string): { idea: Idea } | { response: NextResponse } {
  const version = getVersion(versionId);
  if (!version) return { response: apiError("not_found", "No such version.", 404) };
  return requireOwnedIdea(key, version.idea_id);
}
