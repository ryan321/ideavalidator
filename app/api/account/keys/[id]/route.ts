import { NextResponse } from "next/server";
import { revokeApiKeyForUser } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

// DELETE /api/account/keys/{id} — revoke one of your own keys.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const ok = revokeApiKeyForUser(id, auth.user.id);
  if (!ok) return NextResponse.json({ error: "No such key." }, { status: 404 });
  return NextResponse.json({ revoked: true });
}
