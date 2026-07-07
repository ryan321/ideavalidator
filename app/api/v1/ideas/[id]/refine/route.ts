import { NextResponse } from "next/server";
import { currentVersion } from "@/lib/db";
import { apiError, authenticate, requireOwnedIdea } from "@/lib/apiauth";
import { charge, withRefundOnError } from "@/lib/apirun";
import { proposeRefinement } from "@/lib/generators/refine";

export const runtime = "nodejs";
export const maxDuration = 120;

// POST /api/v1/ideas/{id}/refine — propose a sharper statement targeting the current
// version's weak criteria. Returns the proposal; create it with POST .../versions, then
// validate. Costs one credit.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = authenticate(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const owned = requireOwnedIdea(auth.key, id);
  if ("response" in owned) return owned.response;
  const version = currentVersion(id);
  if (!version) return apiError("not_found", "This idea has no version to refine.", 404);

  const charged = charge(auth.key);
  if (charged) return charged;
  try {
    const p = await withRefundOnError(auth.key, () => proposeRefinement(version.id));
    return NextResponse.json({
      statement: p.statement,
      label: p.label,
      rationale: p.rationale,
      changes: p.changes,
      expected_effect: p.expected_effect,
    });
  } catch (e) {
    return apiError("generation_failed", e instanceof Error ? e.message : "Refine failed", 502);
  }
}
