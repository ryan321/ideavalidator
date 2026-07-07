import { NextResponse } from "next/server";
import { authenticate } from "@/lib/apiauth";

export const runtime = "nodejs";

// GET /api/v1/account — the calling key's balance and identity. Free.
export async function GET(req: Request) {
  const auth = authenticate(req);
  if (!auth.ok) return auth.response;
  return NextResponse.json({
    key_prefix: auth.key.prefix,
    label: auth.key.label,
    credits: auth.key.credits, // -1 = unlimited
    unlimited: auth.key.credits < 0,
    created_at: auth.key.created_at,
  });
}
