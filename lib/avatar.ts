/** 1–2 letter monogram for the avatar: initials of the first two name words, else the
 * email's first letter. Uppercased; falls back to "?" for a blank record. Server-safe
 * (used by the app + marketing layouts to feed the client AvatarMenu). */
export function initialsFor(name: string | null, email: string): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1) return words[0][0].toUpperCase();
  return (email.trim()[0] ?? "?").toUpperCase();
}
