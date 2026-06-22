// Free domain-availability checks via RDAP (rdap.org bootstraps to the authoritative server).
// 404 = not registered (available), 200 = registered (taken). Limited to TLDs with reliable RDAP.
import { DEFAULT_TLDS } from "./tlds";

export type DomainStatus = "available" | "taken" | "unknown";

// A cheap, no-LLM read of what (if anything) is actually served at the domain.
export type SiteSignal = {
  reachable: boolean; // did a page load at all?
  placeholder: boolean; // parked / for-sale / default-server / coming-soon page
  title: string | null; // the <title>, if a real page rendered
};

// Bound total RDAP concurrency so a big batch (many names × many TLDs) doesn't
// hammer rdap.org into rate-limiting every lookup into a useless "unknown".
const MAX_RDAP = 8;
let active = 0;
const waiters: (() => void)[] = [];
async function withRdapLimit<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_RDAP) await new Promise<void>((r) => waiters.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiters.shift()?.();
  }
}

async function checkOne(domain: string): Promise<DomainStatus> {
  return withRdapLimit(async () => {
    try {
      const res = await fetch(`https://rdap.org/domain/${domain}`, {
        signal: AbortSignal.timeout(6000),
        headers: { Accept: "application/rdap+json" },
        redirect: "follow",
      });
      if (res.status === 404) return "available";
      if (res.status === 200) return "taken";
      return "unknown";
    } catch {
      return "unknown";
    }
  });
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Check a brand name across the chosen TLDs. Returns { ".com": status, ... }. */
export async function checkDomains(
  name: string,
  tlds: readonly string[] = DEFAULT_TLDS
): Promise<Record<string, DomainStatus>> {
  const slug = slugify(name);
  if (!slug) return {};
  const entries = await Promise.all(
    tlds.map(async (tld) => [tld, await checkOne(slug + tld)] as const)
  );
  return Object.fromEntries(entries);
}

// Strong parked/placeholder tells. Kept specific to avoid flagging real sites that
// merely mention a host (e.g. a footer "Built with GoDaddy") — so no bare "godaddy".
const PARKED_HINTS = [
  "domain for sale",
  "buy this domain",
  "this domain is for sale",
  "this domain may be for sale",
  "domain is parked",
  "domain parked",
  "parked free",
  "parkingcrew",
  "sedoparking",
  "hugedomains",
  "afternic",
  "godaddy parking",
  "under construction",
  "default web page",
  "welcome to nginx",
  "apache2 ubuntu default",
  "future home of something",
];

function looksParked(html: string, title: string | null): boolean {
  const hay = `${title ?? ""}\n${html}`.toLowerCase();
  if (PARKED_HINTS.some((h) => hay.includes(h))) return true;
  // a genuinely empty body with no title is also a placeholder tell (kept tight to
  // avoid catching minimal-but-real landing pages)
  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return !title && bodyText.length < 20;
}

/** Best-effort: does a real site render at this domain, or is it parked/placeholder? */
export async function checkSite(domain: string): Promise<SiteSignal> {
  try {
    const res = await fetch(`https://${domain}`, {
      signal: AbortSignal.timeout(7000),
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ideavalidator/1.0)" },
    });
    if (res.status >= 400) return { reachable: false, placeholder: false, title: null };
    const html = (await res.text()).slice(0, 30000);
    const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "").trim() || null;
    return { reachable: true, placeholder: looksParked(html, title), title };
  } catch {
    return { reachable: false, placeholder: false, title: null };
  }
}
