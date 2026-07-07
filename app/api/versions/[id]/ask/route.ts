import { NextResponse } from "next/server";
import { answerQuestion } from "@/lib/generators/ask";
import { getMessages } from "@/lib/db";
import { campaignAccessForVersion } from "@/lib/billing";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json(getMessages(id));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // campaign-pass gate — grounded Q&A spends OpenRouter money (inert without billing)
  const access = campaignAccessForVersion(id);
  if (!access.allowed) return NextResponse.json({ error: access.reason, billing: access }, { status: 402 });
  const { question } = await req.json();
  if (typeof question !== "string" || question.trim().length < 2) {
    return NextResponse.json({ error: "Ask a question." }, { status: 400 });
  }
  try {
    const res = await answerQuestion(id, question.trim());
    return NextResponse.json(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not answer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
