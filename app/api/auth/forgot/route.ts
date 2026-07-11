import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createPasswordReset, getUserByEmail } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { getRequestLocale } from "@/lib/i18n/server";

export const runtime = "nodejs";

const RESET_TTL_MS = 60 * 60 * 1000; // 60 minutes

// Per-email throttle (module-scope, in-memory — fine for this single-process app):
// at most one send per email per minute, applied silently so the response is identical.
const lastRequestAt = new Map<string, number>();
const THROTTLE_MS = 60 * 1000;

// POST /api/auth/forgot — request a password-reset email ({ email }).
export async function POST(req: Request) {
  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const email = (typeof body.email === "string" ? body.email : "").trim().toLowerCase();
  // resolved unconditionally so response timing stays identical for every case
  const locale = await getRequestLocale();

  // one response for every case — never reveal whether the email exists
  if (email) {
    // opportunistic sweep so attacker-supplied unique emails can't grow the Map forever
    if (lastRequestAt.size > 10_000) {
      const cutoff = Date.now() - THROTTLE_MS;
      for (const [k, v] of lastRequestAt) if (v < cutoff) lastRequestAt.delete(k);
    }
    const last = lastRequestAt.get(email);
    if (!last || Date.now() - last >= THROTTLE_MS) {
      lastRequestAt.set(email, Date.now());
      const user = getUserByEmail(email);
      if (user) {
        const token = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const expires = new Date(Date.now() + RESET_TTL_MS);
        createPasswordReset(tokenHash, user.id, expires.toISOString());
        const resetUrl = `${new URL(req.url).origin}/reset?token=${token}`;
        // fire-and-forget: awaiting the send would make response latency leak
        // whether the account exists
        void sendPasswordResetEmail(user.email, resetUrl, locale).catch(console.error);
      }
    }
  }
  return NextResponse.json({ ok: true });
}
