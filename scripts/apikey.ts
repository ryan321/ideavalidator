// Mint / list / revoke public-API keys. The raw key is shown ONCE at creation — only
// its hash is stored, so it can't be recovered later.
//
//   npm run apikey -- --label "acme agent" --credits 100
//   npm run apikey -- --label "my testing" --unlimited
//   npm run apikey -- --list
//   npm run apikey -- --revoke <key-id>

import "./env";
import { generateApiKey } from "../lib/apiauth";
import { insertApiKey, listApiKeys, revokeApiKey } from "../lib/db";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function main(): void {
  if (process.argv.includes("--list")) {
    const keys = listApiKeys();
    if (!keys.length) return console.log("No API keys yet. Mint one with: npm run apikey -- --label \"…\" --credits 100");
    for (const k of keys) {
      console.log(
        `${k.prefix}…  ${k.revoked ? "[REVOKED] " : ""}credits=${k.credits < 0 ? "∞" : k.credits}  ${k.label ?? "(no label)"}  id=${k.id}  last_used=${k.last_used_at ?? "never"}`
      );
    }
    return;
  }

  const revoke = arg("--revoke");
  if (revoke) {
    console.log(revokeApiKey(revoke) ? `Revoked ${revoke}.` : `No key with id ${revoke}.`);
    return;
  }

  const unlimited = process.argv.includes("--unlimited");
  const creditsArg = arg("--credits");
  const credits = unlimited ? -1 : creditsArg != null ? Number(creditsArg) : 0;
  if (!unlimited && (!Number.isFinite(credits) || credits < 0)) {
    console.error("Provide --credits <n> (a non-negative integer) or --unlimited.");
    process.exit(1);
  }
  const label = arg("--label") ?? null;

  const { raw, hash, prefix } = generateApiKey();
  const key = insertApiKey({ prefix, keyHash: hash, label, credits });
  console.log("\nAPI key created — copy it now, it will NOT be shown again:\n");
  console.log(`  ${raw}\n`);
  console.log(`  label:   ${label ?? "(none)"}`);
  console.log(`  credits: ${credits < 0 ? "unlimited" : credits}`);
  console.log(`  id:      ${key.id}\n`);
  console.log("Use it as:  Authorization: Bearer " + raw + "\n");
}

main();
