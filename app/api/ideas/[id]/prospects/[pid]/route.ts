import { NextResponse } from "next/server";
import { deleteProspect, updateProspect, type ProspectStatus } from "@/lib/db";

export const runtime = "nodejs";

const STATUSES: ProspectStatus[] = ["lead", "contacted", "meeting", "demo", "trial", "paying", "lost"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const { pid } = await params;
  const body = await req.json();
  const fields: Record<string, unknown> = {};
  for (const f of ["name", "company", "channel", "objection", "next_step", "notes"]) {
    if (f in body) fields[f] = typeof body[f] === "string" ? body[f] : null;
  }
  if ("status" in body && STATUSES.includes(body.status)) fields.status = body.status;
  if ("pain" in body) {
    const p = Number(body.pain);
    fields.pain = Number.isFinite(p) && p >= 1 && p <= 5 ? Math.round(p) : null;
  }
  updateProspect(pid, fields);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const { pid } = await params;
  deleteProspect(pid);
  return NextResponse.json({ ok: true });
}
