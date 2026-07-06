// Shared text cleaners for evidence plugins: turn source HTML/markup into a clean
// plain-text excerpt so quotes render honestly in the prompt and UI (no tags, no
// leftover entity soup). hn.ts predates this and keeps its own copy.

const NAMED: Record<string, string> = {
  quot: '"',
  gt: ">",
  lt: "<",
  nbsp: " ",
  amp: "&",
  apos: "'",
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&(quot|gt|lt|nbsp|amp|apos);/gi, (_, n) => NAMED[n.toLowerCase()] ?? `&${n};`);
}

export function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

export function excerpt(text: string, max = 300): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : t.slice(0, max).replace(/\s+\S*$/, "") + "…";
}
