import React from "react";

// Light markdown: ## headings, **bold**, [text](url), -/* bullets, 1. ordered lists,
// --- rules. No dependency — enough for chat replies and deep-mode memos.

function inlineMd(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] != null) {
      out.push(
        <strong key={`${keyBase}-b${k++}`} className="font-semibold text-fg">
          {m[1]}
        </strong>
      );
    } else if (m[2] != null) {
      out.push(
        <a
          key={`${keyBase}-a${k++}`}
          href={m[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline decoration-dotted underline-offset-2"
        >
          {m[2]}
        </a>
      );
    } else {
      out.push(
        <code
          key={`${keyBase}-c${k++}`}
          className="rounded bg-bg/60 px-1 py-0.5 font-mono text-[0.85em] text-accent2"
        >
          {m[4]}
        </code>
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function MarkdownText({
  text,
  className = "space-y-2.5 text-sm leading-relaxed text-fg/90",
}: {
  text: string;
  className?: string;
}) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const lvl = h[1].length;
      blocks.push(
        <p
          key={key++}
          className={`font-semibold tracking-tight text-fg ${
            lvl === 1 ? "mt-1 text-sm" : lvl === 2 ? "mt-2 text-sm" : "mt-2 text-[13px] text-fg/90"
          }`}
        >
          {inlineMd(h[2], `h${key}`)}
        </p>
      );
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push(<hr key={key++} className="my-3 border-border" />);
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={key++} className="ml-4 list-disc space-y-1">
          {items.map((it, j) => (
            <li key={j}>{inlineMd(it, `li${key}-${j}`)}</li>
          ))}
        </ul>
      );
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol key={key++} className="ml-4 list-decimal space-y-1">
          {items.map((it, j) => (
            <li key={j}>{inlineMd(it, `ol${key}-${j}`)}</li>
          ))}
        </ol>
      );
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,3}\s/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim())
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(<p key={key++}>{inlineMd(para.join(" "), `p${key}`)}</p>);
  }
  return <div className={className}>{blocks}</div>;
}
