import { NextResponse } from "next/server";
import { createUser, getUserByEmail } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { startSession } from "@/lib/auth";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: { email?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!EMAIL.test(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  if (getUserByEmail(email)) return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });

  const user = createUser(email, hashPassword(password), typeof body.name === "string" ? body.name.trim() || null : null);
  await startSession(user.id);
  return NextResponse.json({ ok: true, email: user.email }, { status: 201 });
}
