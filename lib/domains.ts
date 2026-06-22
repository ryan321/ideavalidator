// Free domain-availability checks via RDAP (rdap.org bootstraps to the authoritative server).
// 404 = not registered (available), 200 = registered (taken). Limited to TLDs with reliable RDAP.
export const TLDS = [".com", ".io", ".co"] as const;

export type DomainStatus = "available" | "taken" | "unknown";

async function checkOne(domain: string): Promise<DomainStatus> {
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
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Check a brand name across the supported TLDs. Returns { ".com": status, ... }. */
export async function checkDomains(name: string): Promise<Record<string, DomainStatus>> {
  const slug = slugify(name);
  if (!slug) return {};
  const entries = await Promise.all(
    TLDS.map(async (tld) => [tld, await checkOne(slug + tld)] as const)
  );
  return Object.fromEntries(entries);
}
