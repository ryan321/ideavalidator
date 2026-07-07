import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import { getIdea, getVersion } from "@/lib/db";
import { requireVersionOwner } from "@/lib/auth";

export const runtime = "nodejs";
// Headless-Chrome rendering can take a while for a long report.
export const maxDuration = 120;

// System Chrome path — overridable so this works off a mac. puppeteer-core drives an
// already-installed browser (no bundled Chromium download).
const CHROME_PATH =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "report"
  );
}

// GET /api/versions/[id]/pdf → a server-rendered PDF of that version's full report,
// paginated by headless Chrome (real @media print CSS, proper page breaks).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await requireVersionOwner(id);
  if ("response" in owner) return owner.response;
  const version = getVersion(id);
  if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });
  const idea = getIdea(version.idea_id);
  if (!idea) return NextResponse.json({ error: "Idea not found" }, { status: 404 });

  const origin = new URL(req.url).origin;
  const printUrl = `${origin}/idea/${idea.id}/print?version=${version.id}`;
  const filename = `${slugify(idea.title)}-v${version.n}.pdf`;

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    // The print page is auth-gated, and headless Chrome has no session — forward the
    // authenticated caller's own session cookie so the render sees the same user.
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) await page.setExtraHTTPHeaders({ cookie: cookieHeader });
    await page.setViewport({ width: 1000, height: 1400, deviceScaleFactor: 2 });
    await page.emulateMediaType("print");
    await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 60_000 });
    await page.waitForSelector("[data-report-ready]", { timeout: 15_000 });

    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: "16mm", right: "14mm", bottom: "18mm", left: "14mm" },
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: `
        <div style="width:100%;font-size:8px;color:#9aa;padding:0 14mm;display:flex;justify-content:space-between;font-family:sans-serif;">
          <span>${idea.title.replace(/</g, "&lt;").slice(0, 70)}</span>
          <span>IdeaValidator · <span class="pageNumber"></span>/<span class="totalPages"></span></span>
        </div>`,
    });

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF generation failed";
    // A missing Chrome is the most common cause — make it actionable.
    const hint = /ENOENT|executablePath|Failed to launch/i.test(message)
      ? ` (could not launch Chrome at "${CHROME_PATH}" — set CHROME_PATH in .env.local to your browser)`
      : "";
    return NextResponse.json({ error: message + hint }, { status: 500 });
  } finally {
    await browser?.close();
  }
}
