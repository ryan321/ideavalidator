import { NextResponse } from "next/server";
import { currentVersion } from "@/lib/db";
import { apiError, authenticate, requireOwnedIdea } from "@/lib/apiauth";
import { charge, withRefundOnError } from "@/lib/apirun";
import { proposeWedges } from "@/lib/generators/wedges";

export const runtime = "nodejs";
export const maxDuration = 120;

// POST /api/v1/ideas/{id}/wedges — propose 3-5 DIVERGENT strategic variants of the idea.
// Returns the wedges; create the ones you want with POST .../versions and validate each
// (they share the pinned corpus, so scores compare fairly). Costs one credit.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = authenticate(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const owned = requireOwnedIdea(auth.key, id);
  if ("response" in owned) return owned.response;
  const version = currentVersion(id);
  if (!version) return apiError("not_found", "This idea has no version to explore.", 404);

  const charged = charge(auth.key);
  if (charged) return charged;
  try {
    const set = await withRefundOnError(auth.key, () => proposeWedges(version.id));
    return NextResponse.json({ wedges: set.wedges });
  } catch (e) {
    return apiError("generation_failed", e instanceof Error ? e.message : "Wedge proposal failed", 502);
  }
}
