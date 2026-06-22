import { NextResponse } from "next/server";
import { createProspect, getIdea, listProspects } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!getIdea(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ prospects: listProspects(id) });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!getIdea(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "New prospect";
  return NextResponse.json(createProspect(id, name));
}
