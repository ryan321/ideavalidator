import { NextResponse } from "next/server";
import { proposeRefinement } from "@/lib/generators/refine";

export const runtime = "nodejs";
export const maxDuration = 120;

// Propose an AI refinement for a version. Does NOT create a version —
// the client shows the proposal, then POSTs /api/versions to accept it.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const proposal = await proposeRefinement(id);
    return NextResponse.json(proposal);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Refinement failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
