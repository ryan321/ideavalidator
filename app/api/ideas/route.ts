import { NextResponse } from "next/server";
import { createIdea, listIdeas } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(listIdeas());
}

export async function POST(req: Request) {
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
    prov
  );
  return NextResponse.json({ ...idea, version }, { status: 201 });
}
