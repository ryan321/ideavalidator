import { NextResponse } from "next/server";
import { proposeWedges } from "@/lib/generators/wedges";

export const runtime = "nodejs";
export const maxDuration = 120;

// Propose 3-5 divergent wedge variants for a version. Does NOT create versions —
// the client shows the set, then POSTs /api/versions per selected wedge and runs
// the tournament (validation on the pinned corpus) for each.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const proposal = await proposeWedges(id);
    return NextResponse.json(proposal);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Wedge proposal failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
