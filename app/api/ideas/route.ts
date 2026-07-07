import { NextResponse } from "next/server";
import { createIdea, listIdeasForUser } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  return NextResponse.json(listIdeasForUser(auth.user.id));
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { prompt, goal, goalDetail, founderFit, provenance } = await req.json();
  if (typeof prompt !== "string" || prompt.trim().length < 8) {
    return NextResponse.json(
      { error: "Describe your idea in at least a sentence." },
      { status: 400 }
    );
  }
  const clean = prompt.trim();
  const title = clean.split("\n")[0].slice(0, 80) + (clean.length > 80 ? "…" : "");
  // provenance is optional: "organic" | "whiteboard" | null (anything else → neutral null).
  const prov = provenance === "organic" || provenance === "whiteboard" ? provenance : null;
  const { idea, version } = createIdea(
    title,
    clean,
    typeof goal === "string" && goal ? goal : null,
    typeof goalDetail === "string" && goalDetail.trim() ? goalDetail.trim() : null,
    typeof founderFit === "string" && founderFit.trim() ? founderFit.trim() : null,
    prov, // provenance
    null, // owner_key: web-created ideas are user-owned, not API-key-owned
    auth.user.id
  );
  return NextResponse.json({ ...idea, version }, { status: 201 });
}
