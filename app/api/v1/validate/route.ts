import { createIdea } from "@/lib/db";
import { apiError, authenticate } from "@/lib/apiauth";
import { charge, validateCurrentVersion } from "@/lib/apirun";

export const runtime = "nodejs";
export const maxDuration = 300; // grounded validation is ~60-120s

// POST /api/v1/validate — the one-shot endpoint: an idea in, a grounded report out.
// Creates the idea (owned by the key), collects evidence, scores it, returns the
// projected validation. Costs one credit.
export async function POST(req: Request) {
  const auth = authenticate(req);
  if (!auth.ok) return auth.response;

  let body: { idea?: string; goal?: string; founder_fit?: string; provenance?: string; deep?: boolean };
  try {
    body = await req.json();
  } catch {
    return apiError("invalid_request", "Body must be JSON.", 400);
  }
  const idea = typeof body.idea === "string" ? body.idea.trim() : "";
  if (idea.length < 8) return apiError("invalid_request", "`idea` must be at least a sentence.", 400);
  const goal = ["lifestyle", "side_hustle", "venture", "unsure"].includes(body.goal ?? "") ? body.goal! : null;
  const provenance = body.provenance === "organic" || body.provenance === "whiteboard" ? body.provenance : null;

  const charged = charge(auth.key);
  if (charged) return charged;

  const title = idea.split("\n")[0].slice(0, 80) + (idea.length > 80 ? "…" : "");
  const { idea: created } = createIdea(
    title,
    idea,
    goal,
    null,
    typeof body.founder_fit === "string" ? body.founder_fit : null,
    provenance,
    auth.key.id
  );
  return validateCurrentVersion(auth.key, created, body.deep === true);
}
