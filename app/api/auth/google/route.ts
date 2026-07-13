import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { buildAuthUrl, googleConfigured } from "@/lib/google";

export const runtime = "nodejs";

const STATE_COOKIE = "iv_oauth_state";

// GET /api/auth/google → kick off the OAuth flow: set a short-lived random state cookie
// (CSRF guard, checked in the callback) and redirect to Google's consent screen.
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  if (!googleConfigured()) {
    return NextResponse.redirect(`${origin}/login?error=google_unavailable`);
  }
  const state = crypto.randomBytes(16).toString("hex");
  const res = NextResponse.redirect(buildAuthUrl(origin, state));
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 min to complete the round-trip
  });
  return res;
}
