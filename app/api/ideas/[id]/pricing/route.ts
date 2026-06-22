import { NextResponse } from "next/server";
import { createPriceTest, getIdea, listPriceTests } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!getIdea(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ tests: listPriceTests(id) });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!getIdea(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const offer = typeof body.offer === "string" && body.offer.trim() ? body.offer.trim() : "$/mo";
  return NextResponse.json(createPriceTest(id, offer));
}
