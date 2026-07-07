import { NextResponse } from "next/server";
import { healthcheck } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/health — liveness + DB reachability for Fly's health checks. No auth, no data.
export async function GET() {
  try {
    healthcheck();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
