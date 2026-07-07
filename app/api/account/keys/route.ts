import { NextResponse } from "next/server";
import { insertApiKey, listApiKeysForUser } from "@/lib/db";
import { generateApiKey } from "@/lib/apiauth";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

// New self-serve keys start with a small trial balance so the API is testable out of the
// box; buying more is the (separate) top-up flow. Set API_TRIAL_CREDITS=0 to disable.
const TRIAL_CREDITS = Number(process.env.API_TRIAL_CREDITS ?? 5);

// GET /api/account/keys — the signed-in user's keys (never the raw secret).
export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  return NextResponse.json({
    keys: listApiKeysForUser(auth.user.id).map((k) => ({
      id: k.id,
      prefix: k.prefix,
      label: k.label,
      credits: k.credits,
      revoked: !!k.revoked,
      created_at: k.created_at,
      last_used_at: k.last_used_at,
    })),
    trial_credits: TRIAL_CREDITS,
  });
}

// POST /api/account/keys — mint a key. The raw value is returned ONCE and never stored.
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  let label: string | null = null;
  try {
    const body = await req.json();
    label = typeof body?.label === "string" && body.label.trim() ? body.label.trim().slice(0, 60) : null;
  } catch {
    /* label is optional */
  }
  const { raw, hash, prefix } = generateApiKey();
  const key = insertApiKey({ prefix, keyHash: hash, label, credits: TRIAL_CREDITS, userId: auth.user.id });
  return NextResponse.json({ id: key.id, key: raw, prefix, credits: key.credits }, { status: 201 });
}
