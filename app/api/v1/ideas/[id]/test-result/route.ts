import { NextResponse } from "next/server";
import { currentVersion } from "@/lib/db";
import { apiError, authenticate, requireOwnedIdea } from "@/lib/apiauth";
import { charge, withRefundOnError } from "@/lib/apirun";
import { recordTestResult } from "@/lib/generators/testresult";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/v1/ideas/{id}/test-result — record the real-world outcome of the kill-test.
// Body: { report: string }. The system judges it against the PRE-REGISTERED pass/kill
// bars (not the founder's call) and returns { outcome, reasoning }. Costs one credit.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = authenticate(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const owned = requireOwnedIdea(auth.key, id);
  if ("response" in owned) return owned.response;
  const version = currentVersion(id);
  if (!version) return apiError("not_found", "This idea has no version.", 404);

  let report = "";
  try {
    report = (await req.json())?.report ?? "";
  } catch {
    return apiError("invalid_request", "Body must be JSON with a `report` string.", 400);
  }
  if (typeof report !== "string" || report.trim().length < 10) {
    return apiError("invalid_request", "`report` must describe what happened (numbers first).", 400);
  }

  const charged = charge(auth.key);
  if (charged) return charged;
  try {
    const art = await withRefundOnError(auth.key, () => recordTestResult(version.id, report));
    return NextResponse.json(art.data);
  } catch (e) {
    return apiError("generation_failed", e instanceof Error ? e.message : "Could not record the result", 502);
  }
}
