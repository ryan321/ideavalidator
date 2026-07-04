// A small low-agreement marker for a criterion where the k self-consistency scoring
// runs disagreed materially (spread = max−min band-score > threshold). The number is
// stored only when it exceeded that threshold, so its mere presence means "the runs
// didn't agree here — trust this one less".

export function SpreadMarker({ spread }: { spread?: number | null }) {
  if (spread == null || spread <= 0) return null;
  return (
    <span
      className="inline-block shrink-0 rounded-full border border-warn/40 bg-warn/10 px-1.5 py-px font-mono text-[9px] uppercase tracking-wide text-warn"
      title={`Low agreement — the ${spread}-point spread is how far apart the k scoring runs landed on this criterion. Weight it less.`}
    >
      ±{spread} disagree
    </span>
  );
}
