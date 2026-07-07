import { NextResponse } from "next/server";
import { currentVersion } from "@/lib/db";
import { apiError, authenticate, requireOwnedIdea } from "@/lib/apiauth";
import { charge, withRefundOnError } from "@/lib/apirun";
import { generateIntel } from "@/lib/generators/intel";

export const runtime = "nodejs";
export const maxDuration = 120;

// POST /api/v1/ideas/{id}/intel — cited competitor pricing/funding (via Exa web) + a
// pricing anchor + a copyable one-liner. Requires a prior validation with named
// competitors, and EXA_API_KEY on the server. Costs one credit.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = authenticate(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const owned = requireOwnedIdea(auth.key, id);
  if ("response" in owned) return owned.response;
  const version = currentVersion(id);
  if (!version) return apiError("not_found", "This idea has no version.", 404);

  const charged = charge(auth.key);
  if (charged) return charged;
  try {
    const art = await withRefundOnError(auth.key, () => generateIntel(version.id));
    return NextResponse.json(art.data);
  } catch (e) {
    return apiError("generation_failed", e instanceof Error ? e.message : "Intel generation failed", 502);
  }
}
