import { cookies } from "next/headers";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  createSession,
  deleteSession,
  getIdeaForUser,
  getUserBySessionHash,
  getVersion,
  type Idea,
  type User,
} from "./db";

// Server-side sessions: a random 32-byte token lives in an httpOnly cookie; only its
// sha256 is stored, so a database leak never exposes a live session. The DB check
// (getSessionUser) is the real gate — better-sqlite3 can't run in edge middleware, so
// pages/routes call these helpers directly rather than relying on middleware.

const COOKIE = "iv_session";
const MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days

const hashToken = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

/** Create a session for a user and set the cookie (call from a route handler). */
export async function startSession(userId: string): Promise<void> {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + MAX_AGE_S * 1000);
  createSession(hashToken(token), userId, expires.toISOString());
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

/** Create a session and set the cookie ON a given response — for handlers that return a
 * redirect (e.g. the OAuth callback), where mutating the async cookie store is unreliable. */
export function issueSessionCookie(res: NextResponse, userId: string): void {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + MAX_AGE_S * 1000);
  createSession(hashToken(token), userId, expires.toISOString());
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

/** Destroy the current session and clear the cookie. */
export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) deleteSession(hashToken(token));
  store.delete(COOKIE);
}

/** The logged-in user, or null. Safe to call from server components and route handlers. */
export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  return getUserBySessionHash(hashToken(token)) ?? null;
}

/** For API routes: the user, or a 401 response to return. */
export async function requireUser(): Promise<{ user: User } | { response: NextResponse }> {
  const user = await getSessionUser();
  if (!user) return { response: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  return { user };
}

const notFound = () => ({ response: NextResponse.json({ error: "Not found" }, { status: 404 }) });

/** Resolve an idea the session user owns, or 401/404 (never leak another user's idea). */
export async function requireIdeaOwner(id: string): Promise<{ user: User; idea: Idea } | { response: NextResponse }> {
  const u = await requireUser();
  if ("response" in u) return u;
  const idea = getIdeaForUser(id, u.user.id);
  if (!idea) return notFound();
  return { user: u.user, idea };
}

/** Resolve a version the session user owns (via its idea), or 401/404. */
export async function requireVersionOwner(
  versionId: string
): Promise<{ user: User; idea: Idea } | { response: NextResponse }> {
  const u = await requireUser();
  if ("response" in u) return u;
  const version = getVersion(versionId);
  if (!version) return notFound();
  const idea = getIdeaForUser(version.idea_id, u.user.id);
  if (!idea) return notFound();
  return { user: u.user, idea };
}
