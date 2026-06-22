import { NextResponse } from "next/server";
import { deleteVersion } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = deleteVersion(id);
  if (!ok)
    return NextResponse.json(
      { error: "Can't delete the original or the chosen version" },
      { status: 400 }
    );
  return NextResponse.json({ ok: true });
}
