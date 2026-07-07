import { NextResponse } from "next/server";
import { deleteUser, getUserById } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { endSession, requireUser } from "@/lib/auth";

export const runtime = "nodejs";

// DELETE /api/account — permanently delete the account and everything it owns.
// Body: { password } (re-confirm before an irreversible action).
export async function DELETE(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const body = await req.json().catch(() => ({}));
  const fresh = getUserById(auth.user.id);
  if (!fresh || !verifyPassword(typeof body.password === "string" ? body.password : "", fresh.password_hash)) {
    return NextResponse.json({ error: "Password is wrong." }, { status: 400 });
  }
  await endSession();
  deleteUser(auth.user.id);
  return NextResponse.json({ deleted: true });
}
