import type { HelpBlock } from "@/lib/help/docs";
import { getTranslator } from "@/lib/i18n/server";

export async function HelpDocBody({ blocks }: { blocks: HelpBlock[] }) {
  const { t } = await getTranslator();
  return (
    <div className="space-y-5 text-[15px] leading-relaxed text-fg/90">
      {blocks.map((b, i) => {
        if (b.type === "p") {
          return (
            <p key={i} className="max-w-2xl">
              {b.text}
            </p>
          );
        }
        if (b.type === "h2") {
          return (
            <h2
              key={i}
              className="pt-2 font-display text-lg font-bold tracking-tight text-fg"
            >
              {b.text}
            </h2>
          );
        }
        if (b.type === "ul") {
          return (
            <ul key={i} className="max-w-2xl space-y-2 pl-0">
              {b.items.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (b.type === "ol") {
          return (
            <ol key={i} className="max-w-2xl list-none space-y-2.5 pl-0">
              {b.items.map((item, j) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-0.5 shrink-0 font-mono text-xs font-semibold tabular-nums text-accent2">
                    {String(j + 1).padStart(2, "0")}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          );
        }
        if (b.type === "table") {
          return (
            <div key={i} className="max-w-2xl overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[18rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-panel2/80 font-mono text-[10px] uppercase tracking-wide text-muted">
                    {b.headers.map((h) => (
                      <th key={h} className="px-3 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((row, ri) => (
                    <tr key={ri} className="border-b border-border/60 last:border-0">
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          className={`px-3 py-2.5 align-top ${ci === 0 ? "text-fg/90" : "text-muted"}`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        // callout
        return (
          <aside
            key={i}
            className="max-w-2xl rounded-xl border border-accent/25 bg-accent/[0.06] px-4 py-3 text-sm leading-relaxed text-fg/90"
          >
            <span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
              {t("help.note")}
            </span>
            {b.text}
          </aside>
        );
      })}
    </div>
  );
}
