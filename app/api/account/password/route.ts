import { NextResponse } from "next/server";
import { getUserById, updateUserPassword } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

// POST /api/account/password — change password ({ current, next }).
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const body = await req.json().catch(() => ({}));
  const current = typeof body.current === "string" ? body.current : "";
  const next = typeof body.next === "string" ? body.next : "";
  if (next.length < 8) return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  const fresh = getUserById(auth.user.id);
  if (!fresh || !verifyPassword(current, fresh.password_hash)) {
    return NextResponse.json({ error: "Current password is wrong." }, { status: 400 });
  }
  updateUserPassword(auth.user.id, hashPassword(next));
  return NextResponse.json({ ok: true });
}
