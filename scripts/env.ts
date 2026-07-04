// Tiny .env loader for the calibration scripts — they run under `npx tsx`, not Next,
// so .env.local isn't auto-loaded. Import this module FIRST (side-effect import).
// Sets only keys not already present in the environment; .env.local wins over .env.

import fs from "node:fs";
import path from "node:path";

for (const file of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    if (line.trim().startsWith("#")) continue;
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    } else {
      // Unquoted values may carry an inline comment ("slug  # why") — Next strips
      // these when it loads .env.local, so we must too or model IDs break.
      v = v.replace(/\s+#.*$/, "").trim();
    }
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}
