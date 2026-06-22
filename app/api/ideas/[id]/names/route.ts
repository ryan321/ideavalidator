import { NextResponse } from "next/server";
import { generateNames } from "@/lib/generators/names";
import { getIdea, getNameData } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!getIdea(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(getNameData(id));
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const res = await generateNames(id);
    return NextResponse.json(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not generate names";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
