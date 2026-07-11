import { NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  deletePasswordResetsForUser,
  deleteSessionsForUser,
  getPasswordResetUserId,
  updateUserPassword,
} from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { startSession } from "@/lib/auth";

export const runtime = "nodejs";

// POST /api/auth/reset — set a new password from an emailed link ({ token, password }).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  }
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const userId = token ? getPasswordResetUserId(tokenHash) : undefined;
  // one generic message for missing, unknown, and expired tokens alike
  if (!userId) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }
  updateUserPassword(userId, hashPassword(password));
  deletePasswordResetsForUser(userId);
  deleteSessionsForUser(userId); // a reset kills every existing session
  await startSession(userId); // and signs the user in here
  return NextResponse.json({ ok: true });
}
