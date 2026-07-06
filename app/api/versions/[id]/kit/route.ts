import { NextResponse } from "next/server";
import { generateKit } from "@/lib/generators/kit";

export const runtime = "nodejs";
export const maxDuration = 120;

// Generate (and persist) the kill-test execution kit for a version. Requires a
// validation artifact — the kit operationalizes its next_test.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const artifact = await generateKit(id);
    return NextResponse.json(artifact);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kit generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
