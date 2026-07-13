import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForProfile, findOrCreateGoogleUser, googleConfigured } from "@/lib/google";
import { issueSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

const STATE_COOKIE = "iv_oauth_state";

// GET /api/auth/google/callback → Google redirects here with ?code&state. Verify the state
// against our cookie (CSRF), exchange the code for the verified profile, resolve/create the
// account, start a session, and land in the studio. Any failure → /login with a generic code.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;

  const clearState = (res: NextResponse) => {
    res.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  };
  const fail = (code: string) => clearState(NextResponse.redirect(`${origin}/login?error=${code}`));

  if (!googleConfigured()) return fail("google_unavailable");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const store = await cookies();
  const cookieState = store.get(STATE_COOKIE)?.value;

  // Consent denied, malformed callback, or a state that doesn't match the one we issued.
  if (url.searchParams.get("error") || !code || !state) return fail("google_failed");
  if (!cookieState || cookieState !== state) return fail("google_failed");

  try {
    const profile = await exchangeCodeForProfile(code, origin);
    if (!profile.emailVerified) return fail("google_unverified");
    const user = findOrCreateGoogleUser(profile);
    const res = clearState(NextResponse.redirect(`${origin}/studio`));
    issueSessionCookie(res, user.id);
    return res;
  } catch (e) {
    console.error("Google OAuth callback failed:", e);
    return fail("google_failed");
  }
}
