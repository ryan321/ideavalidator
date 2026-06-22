import { NextResponse } from "next/server";
import { deletePriceTest, updatePriceTest } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const { pid } = await params;
  const body = await req.json();
  const fields: Record<string, unknown> = {};
  for (const f of ["offer", "audience", "notes"]) {
    if (f in body) fields[f] = typeof body[f] === "string" ? body[f] : null;
  }
  for (const f of ["asked", "willing"]) {
    if (f in body) {
      const n = Number(body[f]);
      fields[f] = Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
    }
  }
  updatePriceTest(pid, fields);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const { pid } = await params;
  deletePriceTest(pid);
  return NextResponse.json({ ok: true });
}
