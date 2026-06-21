import { NextResponse } from "next/server";
import { createIdea, listIdeas } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(listIdeas());
}

export async function POST(req: Request) {
  const { prompt } = await req.json();
  if (typeof prompt !== "string" || prompt.trim().length < 8) {
    return NextResponse.json(
      { error: "Describe your idea in at least a sentence." },
      { status: 400 }
    );
  }
  const clean = prompt.trim();
  const title = clean.split("\n")[0].slice(0, 80) + (clean.length > 80 ? "…" : "");
  const { idea, version } = createIdea(title, clean);
  return NextResponse.json({ ...idea, version }, { status: 201 });
}
