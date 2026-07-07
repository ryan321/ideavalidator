import { NextResponse } from "next/server";
import { createIdea, listIdeasByOwner } from "@/lib/db";
import { apiError, authenticate } from "@/lib/apiauth";

export const runtime = "nodejs";

// GET /api/v1/ideas — list the ideas this key owns (no validation runs, so free).
export async function GET(req: Request) {
  const auth = authenticate(req);
  if (!auth.ok) return auth.response;
  const ideas = listIdeasByOwner(auth.key.id).map((i) => ({
    id: i.id,
    title: i.title,
    goal: i.goal,
    best_score: i.best_score,
    version_count: i.version_count,
    created_at: i.created_at,
  }));
  return NextResponse.json({ ideas });
}

// POST /api/v1/ideas — create an idea without validating it (free). Validate it with
// POST /api/v1/ideas/{id}/validate when ready.
export async function POST(req: Request) {
  const auth = authenticate(req);
  if (!auth.ok) return auth.response;
  let body: { idea?: string; goal?: string; founder_fit?: string; provenance?: string };
  try {
    body = await req.json();
  } catch {
    return apiError("invalid_request", "Body must be JSON.", 400);
  }
  const statement = typeof body.idea === "string" ? body.idea.trim() : "";
  if (statement.length < 8) return apiError("invalid_request", "`idea` must be at least a sentence.", 400);
  const goal = ["lifestyle", "side_hustle", "venture", "unsure"].includes(body.goal ?? "") ? body.goal! : null;
  const provenance = body.provenance === "organic" || body.provenance === "whiteboard" ? body.provenance : null;
  const title = statement.split("\n")[0].slice(0, 80) + (statement.length > 80 ? "…" : "");
  const { idea, version } = createIdea(
    title,
    statement,
    goal,
    null,
    typeof body.founder_fit === "string" ? body.founder_fit : null,
    provenance,
    auth.key.id
  );
  return NextResponse.json({ id: idea.id, title: idea.title, goal: idea.goal, version_id: version.id, version: version.n }, { status: 201 });
}
