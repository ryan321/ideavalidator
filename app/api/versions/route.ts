import { NextResponse } from "next/server";
import { createVersion, getIdea, type VersionOrigin } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { ideaId, statement, label, origin, parentId, rationale, context } = await req.json();
  if (!ideaId || !getIdea(ideaId)) {
    return NextResponse.json({ error: "Unknown ideaId" }, { status: 400 });
  }
  if (typeof statement !== "string" || statement.trim().length < 8) {
    return NextResponse.json(
      { error: "Statement must be at least a sentence." },
      { status: 400 }
    );
  }
  const version = createVersion(ideaId, {
    statement: statement.trim(),
    label: label ?? null,
    origin: (origin as VersionOrigin) ?? "manual",
    parentId: parentId ?? null,
    rationale: rationale ?? null,
    context: typeof context === "string" && context.trim() ? context.trim() : null,
  });
  return NextResponse.json(version, { status: 201 });
}
