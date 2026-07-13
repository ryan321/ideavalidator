import crypto from "node:crypto";
import { hashPassword } from "./password";
import { createUser, getUserByEmail, getUserByGoogleId, linkGoogleId, type User } from "./db";

// Google "Sign in with Google" via raw OAuth 2.0 / OpenID Connect — no SDK, matching the
// house style (see lib/email.ts). Create an OAuth client at
// https://console.cloud.google.com/apis/credentials (type "Web application") and add the
// redirect URI `<origin>/api/auth/google/callback`. Set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
// Absent creds → the feature is simply off (the button is hidden and the route 302s to /login).

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const SCOPE = "openid email profile";
const TIMEOUT_MS = 10000;

export function googleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function callbackUrl(origin: string): string {
  return `${origin}/api/auth/google/callback`;
}

/** The Google consent-screen URL to redirect the user to. `state` guards against CSRF. */
export function buildAuthUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: callbackUrl(origin),
    response_type: "code",
    scope: SCOPE,
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
};

/** Exchange the authorization code for the user's Google profile. Throws on any failure. */
export async function exchangeCodeForProfile(code: string, origin: string): Promise<GoogleProfile> {
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: callbackUrl(origin),
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!tokenRes.ok) throw new Error(`Google token exchange ${tokenRes.status}`);
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) throw new Error("Google token response missing access_token");

  // Fetch the profile with the access token we just obtained directly from Google over TLS.
  const userRes = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!userRes.ok) throw new Error(`Google userinfo ${userRes.status}`);
  const u = (await userRes.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };
  if (!u.sub || !u.email) throw new Error("Google userinfo missing sub/email");
  return {
    sub: u.sub,
    email: u.email.toLowerCase(),
    emailVerified: u.email_verified === true,
    name: u.name?.trim() || null,
  };
}

/**
 * Resolve a Validorian account for a verified Google profile: match on Google id, else link
 * to an existing same-email account, else create a fresh one. Only ever called with a
 * verified email (the callback rejects unverified), so linking can't be used to take over a
 * password account with an unproven address. New accounts get a random unusable password
 * (Google is the only way in until they set one via the reset flow).
 */
export function findOrCreateGoogleUser(p: GoogleProfile): User {
  const byGoogle = getUserByGoogleId(p.sub);
  if (byGoogle) return byGoogle;

  const existing = getUserByEmail(p.email);
  if (existing) {
    if (!existing.google_id) linkGoogleId(existing.id, p.sub);
    return { ...existing, google_id: p.sub };
  }

  const sentinel = hashPassword(crypto.randomBytes(32).toString("hex"));
  return createUser(p.email, sentinel, p.name, p.sub);
}
