import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { startSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  const user = getUserByEmail(email);
  // one generic message for both cases — never reveal whether the email exists
  if (!user || !verifyPassword(body.password ?? "", user.password_hash)) {
    return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
  }
  await startSession(user.id);
  return NextResponse.json({ ok: true, email: user.email });
}
