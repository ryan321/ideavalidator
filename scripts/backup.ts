// On-demand SQLite backup using better-sqlite3's online .backup() (safe while the app is
// running). Writes a timestamped copy under $DATA_DIR/backups and keeps the newest 14.
//
//   fly ssh console -C "npm run backup"      # inside the deployed machine
//   npm run backup                            # locally
//
// This is a supplement to Fly's automatic daily volume snapshots (5-day retention). For
// continuous, point-in-time durability, run litestream against the DB file instead.

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const KEEP = 14;

function stamp(): string {
  // no Date-format deps; build an ISO-ish stamp from the numeric parts
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}

async function main() {
  const src = path.join(DATA_DIR, "ideavalidator.db");
  if (!fs.existsSync(src)) {
    console.error(`No database at ${src}.`);
    process.exit(1);
  }
  const dir = path.join(DATA_DIR, "backups");
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, `ideavalidator-${stamp()}.db`);

  const db = new Database(src, { readonly: true });
  await db.backup(dest);
  db.close();
  console.log(`Backed up → ${dest} (${(fs.statSync(dest).size / 1024).toFixed(0)} KB)`);

  // prune old backups
  const backups = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("ideavalidator-") && f.endsWith(".db"))
    .sort()
    .reverse();
  for (const old of backups.slice(KEEP)) {
    fs.rmSync(path.join(dir, old));
    console.log(`Pruned ${old}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
