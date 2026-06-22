// Plain data shared by the server domain checker and the client TLD picker.
// Default set we check unless the founder picks otherwise.
export const DEFAULT_TLDS = [".com", ".io", ".co"] as const;

// The full menu the founder can toggle. Kept to TLDs with usable RDAP coverage
// (others will simply report "unknown").
export const ALL_TLDS = [
  ".com",
  ".io",
  ".co",
  ".ai",
  ".app",
  ".dev",
  ".net",
  ".org",
  ".xyz",
  ".me",
  ".tech",
  ".studio",
  ".so",
  ".sh",
  ".inc",
] as const;
