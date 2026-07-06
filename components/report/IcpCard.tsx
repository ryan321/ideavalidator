import type { Validation } from "@/lib/generators/validation";

// Who buys & how to reach them. The honest twist vs competitor products: channels that
// match the fetched corpus get an "evidence found here" chip — those hangouts are
// PROVEN (we pulled real posts from them), not asserted. And no fabricated per-channel
// CAC dollar figures, ever — channel-fit reasoning only.

function matchesCommunity(channel: string, communities: string[]): boolean {
  const c = channel.toLowerCase();
  return communities.some((k) => {
    const s = k.toLowerCase();
    if (c.includes(s) || s.includes(c.replace(/^r\//, ""))) return true;
    // stem match: "numyum.ai" → "numyum", "owner/repo" → both segments — so a channel
    // like "SEO blogs (numyum, findnewdaily …)" still credits the corpus domains.
    return s.split(/[/.\s]/).some((t) => t.length >= 4 && c.includes(t));
  });
}

export function IcpCard({
  icp,
  communities = [],
}: {
  icp: NonNullable<Validation["icp"]>;
  /** Corpus communities evidence was actually fetched from (proven hangouts). */
  communities?: string[];
}) {
  const channels = (icp.channels ?? []).filter((c) => c.name);
  if (!icp.who && !channels.length) return null;

  return (
    <div>
      <div className="mb-2.5 font-mono text-sm uppercase tracking-[0.1em] text-muted">Who buys &amp; how</div>
      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
        {icp.who && (
          <div className="bg-panel p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">The buyer</div>
            <p className="mt-1 text-sm leading-relaxed text-fg/90">{icp.who}</p>
          </div>
        )}
        {icp.how_they_buy && (
          <div className="bg-panel p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">How they buy</div>
            <p className="mt-1 text-sm leading-relaxed text-fg/90">{icp.how_they_buy}</p>
          </div>
        )}
        {(icp.trigger_events ?? []).length > 0 && (
          <div className="bg-panel p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent2">Trigger moments</div>
            <ul className="mt-1 space-y-1">
              {icp.trigger_events.map((t, i) => (
                <li key={i} className="text-sm leading-snug text-fg/90">⚡ {t}</li>
              ))}
            </ul>
          </div>
        )}
        {(icp.objections ?? []).length > 0 && (
          <div className="bg-panel p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-warn">Objections you&apos;ll hear</div>
            <ul className="mt-1 space-y-1">
              {icp.objections.map((o, i) => (
                <li key={i} className="text-sm leading-snug text-fg/90">— {o}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {channels.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            Channels, ranked by fit — no invented CAC numbers
          </div>
          <div className="space-y-1.5">
            {channels.map((c, i) => {
              const proven = matchesCommunity(c.name, communities);
              return (
                <div key={i} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 rounded-lg border border-border/70 bg-panel/40 px-3.5 py-2">
                  <span className="font-mono text-xs text-accent2">{i + 1}.</span>
                  <span className="text-sm font-medium text-fg/90">{c.name}</span>
                  {proven && (
                    <span
                      className="rounded-full border border-good/40 bg-good/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-good"
                      title="This channel is in the fetched evidence corpus — real posts about this problem were found here."
                    >
                      evidence found here
                    </span>
                  )}
                  {c.why && <span className="min-w-0 flex-1 text-xs leading-relaxed text-muted">{c.why}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
