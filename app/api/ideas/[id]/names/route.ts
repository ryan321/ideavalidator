import { NextResponse } from "next/server";
import { generateNames, setNameFeedback } from "@/lib/generators/names";
import { getIdea, getNameData } from "@/lib/db";
import { ALL_TLDS } from "@/lib/tlds";

export const runtime = "nodejs";
// Per-candidate web-grounded due diligence runs in parallel — give it room.
export const maxDuration = 300;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!getIdea(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(getNameData(id));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!getIdea(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let body: { instructions?: unknown; tlds?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is fine */
  }
  try {
    const tlds = Array.isArray(body.tlds)
      ? body.tlds.filter((t): t is string => typeof t === "string" && (ALL_TLDS as readonly string[]).includes(t))
      : null;
    const res = await generateNames(id, {
      instructions: typeof body.instructions === "string" ? body.instructions : null,
      tlds: tlds && tlds.length ? tlds : null,
    });
    return NextResponse.json(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not generate names";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Thumbs up/down on a candidate — persisted, and fed into the next generation.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!getIdea(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  const name = typeof body.name === "string" ? body.name : null;
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const feedback = body.feedback === "up" || body.feedback === "down" ? body.feedback : null;
  const candidates = setNameFeedback(id, name, feedback);
  return NextResponse.json({ candidates });
}
