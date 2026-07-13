import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import type { Source, Usage } from "./ai/client";
import type { EvidenceCorpus } from "./evidence/types";

// ---- connection (singleton across dev hot-reloads) ---------------------------
// DATA_DIR points at the durable store. Locally that's ./data; in production set it to a
// mounted volume (e.g. DATA_DIR=/data on Fly) so the SQLite file survives deploys/restarts.
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const globalForDb = globalThis as unknown as { _db?: Database.Database };

function tableExists(db: Database.Database, name: string): boolean {
  return !!db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(name);
}
function tableColumns(db: Database.Database, name: string): string[] {
  return (db.prepare(`PRAGMA table_info(${name})`).all() as { name: string }[]).map(
    (r) => r.name
  );
}

// Idempotent column add — safe under the race where Next's build workers all run init() at once.
function addColumn(db: Database.Database, table: string, col: string, def: string): void {
  if (tableColumns(db, table).includes(col)) return;
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
  } catch (e) {
    if (!String(e).toLowerCase().includes("duplicate column")) throw e;
  }
}

function init(): Database.Database {
  const db = new Database(path.join(DATA_DIR, "ideavalidator.db"));
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS ideas (
      id                TEXT PRIMARY KEY,
      title             TEXT NOT NULL,
      prompt            TEXT,
      goal              TEXT,
      goal_detail       TEXT,
      stage             TEXT,
      founder_fit       TEXT,
      created_at        TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS versions (
      id         TEXT PRIMARY KEY,
      idea_id    TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
      n          INTEGER NOT NULL,
      statement  TEXT NOT NULL,
      label      TEXT,
      origin     TEXT NOT NULL DEFAULT 'original',
      parent_id  TEXT,
      rationale  TEXT,
      context    TEXT,
      score      INTEGER,
      revenue    TEXT,
      created_at TEXT NOT NULL,
      UNIQUE (idea_id, n)
    );
  `);

  // artifacts: version-keyed. Migrate older idea-keyed installs if present.
  if (!tableExists(db, "artifacts")) {
    db.exec(`
      CREATE TABLE artifacts (
        id           TEXT PRIMARY KEY,
        version_id   TEXT NOT NULL,
        kind         TEXT NOT NULL,
        data_json    TEXT NOT NULL,
        sources_json TEXT NOT NULL DEFAULT '[]',
        model        TEXT,
        created_at   TEXT NOT NULL,
        UNIQUE (version_id, kind)
      );
    `);
  } else if (!tableColumns(db, "artifacts").includes("version_id")) {
    migrateArtifactsToVersions(db);
  }

  // founder context on versions + goal on ideas (added in upgrades).
  addColumn(db, "versions", "context", "TEXT");
  addColumn(db, "versions", "revenue", "TEXT");
  // Archived versions are hidden from the switcher/compare and excluded from
  // best_score and the score distribution, but the row (and its artifacts) survive so
  // the history isn't destroyed — cleanupVersions archives instead of deleting.
  addColumn(db, "versions", "archived", "INTEGER DEFAULT 0");
  addColumn(db, "ideas", "goal", "TEXT");
  addColumn(db, "ideas", "goal_detail", "TEXT");
  addColumn(db, "ideas", "stage", "TEXT");
  addColumn(db, "ideas", "founder_fit", "TEXT");
  // Billing (campaign pass): one Stripe payment unlocks the idea's FULL campaign —
  // validations, tournaments, kit, intel, revalidations — up to the run cap (the COGS
  // guardrail). All of it is inert while billing is disabled (no STRIPE_SECRET_KEY).
  addColumn(db, "ideas", "paid", "INTEGER DEFAULT 0");
  addColumn(db, "ideas", "paid_session", "TEXT");
  addColumn(db, "ideas", "campaign_runs", "INTEGER DEFAULT 0");
  // provenance: "organic" (the founder lived the pain) | "whiteboard" (brainstormed) | null
  // (unasked, neutral). Feeds founderProfile — organic credits insider knowledge, whiteboard
  // flags elevated market risk without crediting it.
  addColumn(db, "ideas", "provenance", "TEXT");

  // Public API: bearer keys (only the sha256 HASH is stored) that own the ideas they
  // create, isolating agents from each other and from the local UI (owner_key NULL =
  // the local admin surface). credits: prepaid balance, decremented per validation;
  // -1 = unlimited. The UI routes stay owner-agnostic; only /api/v1/* is key-scoped.
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id            TEXT PRIMARY KEY,
      prefix        TEXT NOT NULL,
      key_hash      TEXT NOT NULL UNIQUE,
      label         TEXT,
      credits       INTEGER NOT NULL DEFAULT 0,
      revoked       INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL,
      last_used_at  TEXT
    );
  `);
  addColumn(db, "ideas", "owner_key", "TEXT"); // NULL = human/UI-owned; else api_keys.id

  // Human accounts (email + password) + server-side sessions. The web UI is scoped to
  // the logged-in user: ideas carry user_id, and only their owner can read them. sessions
  // store the sha256 of the cookie token (a db leak never exposes a live session), with a
  // hard expiry. api_keys also belong to a user (self-serve minting from the account page).
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name          TEXT,
      created_at    TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash    TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at    TEXT NOT NULL,
      expires_at    TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  `);
  // Password resets mirror the session-token model: the emailed link carries a random
  // token; ONLY its sha256 lands here, so a db leak never exposes a usable reset link.
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_resets (
      token_hash    TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at    TEXT NOT NULL,
      expires_at    TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
  `);
  addColumn(db, "ideas", "user_id", "TEXT"); // NULL = legacy/local; else users.id
  addColumn(db, "api_keys", "user_id", "TEXT"); // NULL = CLI-minted; else the owning user
  // Google OAuth: the stable Google account id (`sub`). NULL for password-only accounts.
  addColumn(db, "users", "google_id", "TEXT");

  // usage columns on artifacts (added in upgrades) + a full per-call usage log.
  addColumn(db, "artifacts", "cost", "REAL");
  addColumn(db, "artifacts", "prompt_tokens", "INTEGER");
  addColumn(db, "artifacts", "completion_tokens", "INTEGER");
  db.exec(`
    CREATE TABLE IF NOT EXISTS usage_log (
      id                TEXT PRIMARY KEY,
      idea_id           TEXT,
      version_id        TEXT,
      kind              TEXT NOT NULL,
      model             TEXT,
      prompt_tokens     INTEGER,
      completion_tokens INTEGER,
      cost              REAL,
      created_at        TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_usage_idea ON usage_log(idea_id);
    CREATE TABLE IF NOT EXISTS messages (
      id         TEXT PRIMARY KEY,
      version_id TEXT NOT NULL,
      role       TEXT NOT NULL,
      text       TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_messages_version ON messages(version_id);
    CREATE TABLE IF NOT EXISTS jobs (
      version_id TEXT NOT NULL,
      kind       TEXT NOT NULL,
      status     TEXT NOT NULL, -- 'running' | 'done' | 'error'
      error      TEXT,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (version_id, kind)
    );
    CREATE TABLE IF NOT EXISTS evidence (
      version_id TEXT PRIMARY KEY REFERENCES versions(id) ON DELETE CASCADE,
      data       TEXT NOT NULL,    -- EvidenceCorpus JSON
      created_at INTEGER NOT NULL
    );
  `);

  return db;
}

function migrateArtifactsToVersions(db: Database.Database): void {
  const run = db.transaction(() => {
    const ideas = db
      .prepare("SELECT id, prompt, created_at FROM ideas")
      .all() as { id: string; prompt: string | null; created_at: string }[];
    for (const idea of ideas) {
      const has = db
        .prepare("SELECT id FROM versions WHERE idea_id = ? AND n = 1")
        .get(idea.id);
      if (!has) {
        db.prepare(
          `INSERT INTO versions (id, idea_id, n, statement, origin, created_at)
           VALUES (?, ?, 1, ?, 'original', ?)`
        ).run(crypto.randomUUID(), idea.id, idea.prompt ?? "", idea.created_at);
      }
    }
    db.exec(`
      CREATE TABLE artifacts_new (
        id TEXT PRIMARY KEY, version_id TEXT NOT NULL, kind TEXT NOT NULL,
        data_json TEXT NOT NULL, sources_json TEXT NOT NULL DEFAULT '[]',
        model TEXT, created_at TEXT NOT NULL, UNIQUE (version_id, kind)
      );
      INSERT INTO artifacts_new (id, version_id, kind, data_json, sources_json, model, created_at)
        SELECT a.id, v.id, a.kind, a.data_json, a.sources_json, a.model, a.created_at
        FROM artifacts a JOIN versions v ON v.idea_id = a.idea_id AND v.n = 1;
      DROP TABLE artifacts;
      ALTER TABLE artifacts_new RENAME TO artifacts;
    `);
  });
  run();
}

const db = globalForDb._db ?? init();
if (process.env.NODE_ENV !== "production") globalForDb._db = db;

// ---- types -------------------------------------------------------------------
// "validation" is the main grounded analysis. "kit" (kill-test execution kit),
// "intel" (cited competitor pricing/funding + one-liner), and "test_result" (the
// REAL-WORLD outcome of the kill-test, judged against its pre-registered thresholds)
// are on-demand artifacts with their own routes — none run through GENERATORS.
export type ArtifactKind = "validation" | "kit" | "intel" | "test_result";

export type Idea = {
  id: string;
  title: string;
  prompt: string | null;
  goal: string | null;
  goal_detail: string | null;
  stage: string | null; // current journey stage key
  founder_fit: string | null; // founder's market knowledge / build experience / network
  provenance: "organic" | "whiteboard" | null; // did the idea come from a lived problem or a whiteboard?
  created_at: string;
  // Billing (campaign pass) — 0/absent rows read as unpaid with zero runs.
  paid: number; // 1 once the Stripe checkout for this idea completed
  paid_session: string | null; // the Stripe checkout session id that paid it
  campaign_runs: number; // validations run against the campaign's run cap
  owner_key: string | null; // api_keys.id when created via the public API; NULL = local UI
  user_id: string | null; // the human account that owns this idea (web UI)
};

export type ApiKey = {
  id: string;
  prefix: string; // shown to the user for identification (e.g. "iv_live_a1b2")
  key_hash: string; // sha256 of the full key — the raw key is never stored
  label: string | null;
  credits: number; // prepaid balance; -1 = unlimited
  revoked: number; // 1 = revoked
  created_at: string;
  last_used_at: string | null;
  user_id: string | null; // the account that minted it (NULL for CLI-minted keys)
};

export type User = {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  created_at: string;
  /** Google account id (`sub`) when this account can sign in with Google; else null. */
  google_id: string | null;
};

export type IdeaSummary = Idea & {
  best_score: number | null;
  version_count: number;
  cost: number | null;
  revenue: string | null;
};

export type VersionOrigin = "original" | "manual" | "ai" | "context";

export type Version = {
  id: string;
  idea_id: string;
  n: number;
  statement: string;
  label: string | null;
  origin: VersionOrigin;
  parent_id: string | null;
  rationale: string | null;
  context: string | null;
  score: number | null;
  revenue: string | null; // cached obtainable_revenue from validation (the forecast)
  archived: number; // 0 = active, 1 = archived (hidden from switcher/compare/best_score)
  created_at: string;
};

export type Artifact = {
  id: string;
  version_id: string;
  kind: ArtifactKind;
  data: unknown;
  sources: Source[];
  model: string | null;
  cost: number | null;
  created_at: string;
};

type ArtifactRow = {
  id: string;
  version_id: string;
  kind: ArtifactKind;
  data_json: string;
  sources_json: string;
  model: string | null;
  cost: number | null;
  created_at: string;
};

function rowToArtifact(r: ArtifactRow): Artifact {
  return {
    id: r.id,
    version_id: r.version_id,
    kind: r.kind,
    data: JSON.parse(r.data_json),
    sources: JSON.parse(r.sources_json) as Source[],
    model: r.model,
    cost: r.cost ?? null,
    created_at: r.created_at,
  };
}

// ---- ideas + initial version -------------------------------------------------
export function createIdea(
  title: string,
  statement: string,
  goal?: string | null,
  goalDetail?: string | null,
  founderFit?: string | null,
  provenance?: "organic" | "whiteboard" | null,
  ownerKey?: string | null,
  userId?: string | null
): { idea: Idea; version: Version } {
  const now = new Date().toISOString();
  const idea: Idea = {
    id: crypto.randomUUID(),
    title,
    prompt: statement,
    goal: goal ?? null,
    goal_detail: goalDetail ?? null,
    stage: "validate",
    founder_fit: founderFit ?? null,
    provenance: provenance ?? null,
    created_at: now,
    paid: 0,
    paid_session: null,
    campaign_runs: 0,
    owner_key: ownerKey ?? null,
    user_id: userId ?? null,
  };
  const version: Version = {
    id: crypto.randomUUID(),
    idea_id: idea.id,
    n: 1,
    statement,
    label: null,
    origin: "original",
    parent_id: null,
    rationale: null,
    context: null,
    score: null,
    revenue: null,
    archived: 0,
    created_at: now,
  };
  const tx = db.transaction(() => {
    db.prepare(
      "INSERT INTO ideas (id, title, prompt, goal, goal_detail, stage, founder_fit, provenance, owner_key, user_id, created_at) VALUES (@id, @title, @prompt, @goal, @goal_detail, @stage, @founder_fit, @provenance, @owner_key, @user_id, @created_at)"
    ).run(idea);
    db.prepare(
      `INSERT INTO versions (id, idea_id, n, statement, label, origin, parent_id, rationale, context, score, revenue, created_at)
       VALUES (@id, @idea_id, @n, @statement, @label, @origin, @parent_id, @rationale, @context, @score, @revenue, @created_at)`
    ).run(version);
  });
  tx();
  return { idea, version };
}

/** Cheap DB reachability probe for the health check. Throws if the store is unreachable. */
export function healthcheck(): void {
  db.prepare("SELECT 1").get();
}

export function listIdeas(): IdeaSummary[] {
  return db
    .prepare(
      `SELECT i.*,
              (SELECT MAX(v.score) FROM versions v WHERE v.idea_id = i.id AND v.archived = 0) AS best_score,
              (SELECT COUNT(*) FROM versions v WHERE v.idea_id = i.id AND v.archived = 0) AS version_count,
              (SELECT COALESCE(SUM(u.cost), 0) FROM usage_log u WHERE u.idea_id = i.id) AS cost,
              (SELECT v.revenue FROM versions v WHERE v.idea_id = i.id AND v.revenue IS NOT NULL AND v.archived = 0
                 ORDER BY v.score DESC LIMIT 1) AS revenue
       FROM ideas i ORDER BY i.created_at DESC`
    )
    .all() as IdeaSummary[];
}

export function getIdea(id: string): Idea | undefined {
  return db.prepare("SELECT * FROM ideas WHERE id = ?").get(id) as Idea | undefined;
}

export function setIdeaGoal(id: string, goal: string | null, goalDetail: string | null): void {
  db.prepare("UPDATE ideas SET goal = ?, goal_detail = ? WHERE id = ?").run(goal, goalDetail, id);
}

// ---- billing (campaign pass) ---------------------------------------------------

/** Mark an idea's campaign as paid (idempotent — a replayed webhook is a no-op). */
export function markIdeaPaid(id: string, sessionId: string): void {
  db.prepare("UPDATE ideas SET paid = 1, paid_session = ? WHERE id = ? AND paid = 0").run(sessionId, id);
}

/** Count one validation run against the idea's campaign cap. */
export function incrementCampaignRuns(id: string): void {
  db.prepare("UPDATE ideas SET campaign_runs = COALESCE(campaign_runs, 0) + 1 WHERE id = ?").run(id);
}

// ---- users + sessions (web accounts) ------------------------------------------

export function createUser(
  email: string,
  passwordHash: string,
  name: string | null,
  googleId: string | null = null
): User {
  const user: User = {
    id: crypto.randomUUID(),
    email: email.toLowerCase(),
    password_hash: passwordHash,
    name,
    created_at: new Date().toISOString(),
    google_id: googleId,
  };
  db.prepare(
    "INSERT INTO users (id, email, password_hash, name, created_at, google_id) VALUES (@id, @email, @password_hash, @name, @created_at, @google_id)"
  ).run(user);
  return user;
}

/** Look up an account by its linked Google id (`sub`). */
export function getUserByGoogleId(googleId: string): User | undefined {
  return db.prepare("SELECT * FROM users WHERE google_id = ?").get(googleId) as User | undefined;
}

/** Link a Google account id to an existing (e.g. email/password) user. */
export function linkGoogleId(id: string, googleId: string): void {
  db.prepare("UPDATE users SET google_id = ? WHERE id = ?").run(googleId, id);
}

export function getUserByEmail(email: string): User | undefined {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase()) as User | undefined;
}

export function getUserById(id: string): User | undefined {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined;
}

export function updateUserPassword(id: string, passwordHash: string): void {
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, id);
}

/** Delete a user and everything they own (ideas cascade via their own delete). */
export function deleteUser(id: string): void {
  const tx = db.transaction(() => {
    for (const row of db.prepare("SELECT id FROM ideas WHERE user_id = ?").all(id) as { id: string }[]) {
      deleteIdea(row.id);
    }
    db.prepare("DELETE FROM api_keys WHERE user_id = ?").run(id);
    deleteSessionsForUser(id);
    deletePasswordResetsForUser(id);
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
  });
  tx();
}

/** Persist a session (only the token's sha256 is stored). */
export function createSession(tokenHash: string, userId: string, expiresAt: string): void {
  db.prepare(
    "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
  ).run(tokenHash, userId, new Date().toISOString(), expiresAt);
}

/** The user behind a session token hash, if the session exists and hasn't expired. */
export function getUserBySessionHash(tokenHash: string): User | undefined {
  const row = db
    .prepare("SELECT user_id, expires_at FROM sessions WHERE token_hash = ?")
    .get(tokenHash) as { user_id: string; expires_at: string } | undefined;
  if (!row) return undefined;
  if (Date.parse(row.expires_at) < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash); // reap expired
    return undefined;
  }
  return getUserById(row.user_id);
}

export function deleteSession(tokenHash: string): void {
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
}

/** Kill every session a user has (password reset, account deletion). */
export function deleteSessionsForUser(userId: string): void {
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

// ---- password resets (email link) ---------------------------------------------

/** Persist a reset request (only the token's sha256 is stored). One active reset per
 * user — a fresh request invalidates any earlier link. */
export function createPasswordReset(tokenHash: string, userId: string, expiresAt: string): void {
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM password_resets WHERE user_id = ?").run(userId);
    db.prepare(
      "INSERT INTO password_resets (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
    ).run(tokenHash, userId, new Date().toISOString(), expiresAt);
  });
  tx();
}

/** The user behind a reset token hash, if the reset exists and hasn't expired. */
export function getPasswordResetUserId(tokenHash: string): string | undefined {
  const row = db
    .prepare("SELECT user_id, expires_at FROM password_resets WHERE token_hash = ?")
    .get(tokenHash) as { user_id: string; expires_at: string } | undefined;
  if (!row) return undefined;
  if (Date.parse(row.expires_at) < Date.now()) {
    db.prepare("DELETE FROM password_resets WHERE token_hash = ?").run(tokenHash); // reap expired
    return undefined;
  }
  return row.user_id;
}

export function deletePasswordResetsForUser(userId: string): void {
  db.prepare("DELETE FROM password_resets WHERE user_id = ?").run(userId);
}

// ---- user-scoped idea access (web tenancy) ------------------------------------

/** An idea only if this user owns it — the web UI's isolation boundary. */
export function getIdeaForUser(id: string, userId: string): Idea | undefined {
  return db.prepare("SELECT * FROM ideas WHERE id = ? AND user_id = ?").get(id, userId) as Idea | undefined;
}

/** Every idea owned by a user (newest first), with the summary aggregates. */
export function listIdeasForUser(userId: string): IdeaSummary[] {
  return db
    .prepare(
      `SELECT i.*,
              (SELECT MAX(v.score) FROM versions v WHERE v.idea_id = i.id AND v.archived = 0) AS best_score,
              (SELECT COUNT(*) FROM versions v WHERE v.idea_id = i.id AND v.archived = 0) AS version_count,
              (SELECT COALESCE(SUM(u.cost), 0) FROM usage_log u WHERE u.idea_id = i.id) AS cost,
              (SELECT v.revenue FROM versions v WHERE v.idea_id = i.id AND v.revenue IS NOT NULL AND v.archived = 0
                 ORDER BY v.score DESC LIMIT 1) AS revenue
         FROM ideas i WHERE i.user_id = ? ORDER BY i.created_at DESC`
    )
    .all(userId) as IdeaSummary[];
}

// ---- public API keys ----------------------------------------------------------

export function insertApiKey(row: {
  prefix: string;
  keyHash: string;
  label: string | null;
  credits: number;
  userId?: string | null;
}): ApiKey {
  const key: ApiKey = {
    id: crypto.randomUUID(),
    prefix: row.prefix,
    key_hash: row.keyHash,
    label: row.label,
    credits: row.credits,
    revoked: 0,
    created_at: new Date().toISOString(),
    last_used_at: null,
    user_id: row.userId ?? null,
  };
  db.prepare(
    `INSERT INTO api_keys (id, prefix, key_hash, label, credits, revoked, created_at, last_used_at, user_id)
     VALUES (@id, @prefix, @key_hash, @label, @credits, @revoked, @created_at, @last_used_at, @user_id)`
  ).run(key);
  return key;
}

/** A user's API keys (for the account page). */
export function listApiKeysForUser(userId: string): ApiKey[] {
  return db.prepare("SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC").all(userId) as ApiKey[];
}

/** Revoke a key only if it belongs to this user (self-serve, safe). */
export function revokeApiKeyForUser(id: string, userId: string): boolean {
  return db.prepare("UPDATE api_keys SET revoked = 1 WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
}

export function getApiKeyByHash(hash: string): ApiKey | undefined {
  return db.prepare("SELECT * FROM api_keys WHERE key_hash = ?").get(hash) as ApiKey | undefined;
}

export function touchApiKey(id: string): void {
  db.prepare("UPDATE api_keys SET last_used_at = ? WHERE id = ?").run(new Date().toISOString(), id);
}

/** Atomically spend one credit. Returns true if allowed (unlimited or balance>0 → spent),
 * false if the key is out of credits. -1 credits = unlimited (never decrements). */
export function spendApiCredit(id: string): boolean {
  const row = db.prepare("SELECT credits FROM api_keys WHERE id = ?").get(id) as { credits: number } | undefined;
  if (!row) return false;
  if (row.credits < 0) return true; // unlimited
  const res = db.prepare("UPDATE api_keys SET credits = credits - 1 WHERE id = ? AND credits > 0").run(id);
  return res.changes > 0;
}

/** Refund a credit (e.g. the metered validation failed). No-op for unlimited keys. */
export function refundApiCredit(id: string): void {
  db.prepare("UPDATE api_keys SET credits = credits + 1 WHERE id = ? AND credits >= 0").run(id);
}

export function listApiKeys(): ApiKey[] {
  return db.prepare("SELECT * FROM api_keys ORDER BY created_at DESC").all() as ApiKey[];
}

export function revokeApiKey(id: string): boolean {
  return db.prepare("UPDATE api_keys SET revoked = 1 WHERE id = ?").run(id).changes > 0;
}

// ---- owner-scoped idea access (public API tenancy) ----------------------------

/** An idea only if it belongs to this key — the API's isolation boundary. */
export function getIdeaOwned(id: string, ownerKey: string): Idea | undefined {
  return db.prepare("SELECT * FROM ideas WHERE id = ? AND owner_key = ?").get(id, ownerKey) as Idea | undefined;
}

/** Every idea owned by a key (newest first). */
export function listIdeasByOwner(ownerKey: string): IdeaSummary[] {
  return db
    .prepare(
      `SELECT i.*,
              (SELECT MAX(v.score) FROM versions v WHERE v.idea_id = i.id AND v.archived = 0) AS best_score,
              (SELECT COUNT(*) FROM versions v WHERE v.idea_id = i.id AND v.archived = 0) AS version_count,
              (SELECT SUM(u.cost) FROM usage_log u WHERE u.idea_id = i.id) AS cost,
              (SELECT v.revenue FROM versions v WHERE v.idea_id = i.id AND v.revenue IS NOT NULL AND v.archived = 0
                 ORDER BY v.n DESC LIMIT 1) AS revenue
         FROM ideas i WHERE i.owner_key = ? ORDER BY i.created_at DESC`
    )
    .all(ownerKey) as IdeaSummary[];
}

/** The current (latest, non-archived) version of an idea — the API operates on this. */
export function currentVersion(ideaId: string): Version | undefined {
  return db
    .prepare("SELECT * FROM versions WHERE idea_id = ? AND archived = 0 ORDER BY n DESC LIMIT 1")
    .get(ideaId) as Version | undefined;
}

export function setIdeaJourney(id: string, fields: { stage?: string }): void {
  if (fields.stage !== undefined) db.prepare("UPDATE ideas SET stage = ? WHERE id = ?").run(fields.stage, id);
}

export function deleteIdea(id: string): void {
  const tx = db.transaction(() => {
    db.prepare(
      "DELETE FROM artifacts WHERE version_id IN (SELECT id FROM versions WHERE idea_id = ?)"
    ).run(id);
    db.prepare(
      "DELETE FROM messages WHERE version_id IN (SELECT id FROM versions WHERE idea_id = ?)"
    ).run(id);
    db.prepare("DELETE FROM usage_log WHERE idea_id = ?").run(id);
    db.prepare("DELETE FROM jobs WHERE version_id IN (SELECT id FROM versions WHERE idea_id = ?)").run(id);
    db.prepare(
      "DELETE FROM evidence WHERE version_id IN (SELECT id FROM versions WHERE idea_id = ?)"
    ).run(id);
    db.prepare("DELETE FROM versions WHERE idea_id = ?").run(id);
    db.prepare("DELETE FROM ideas WHERE id = ?").run(id);
  });
  tx();
}

// ---- background jobs (so a long analysis survives leaving the page) ----------
export type JobStatus = "running" | "done" | "error";
export type Job = { version_id: string; kind: string; status: JobStatus; error: string | null; updated_at: string };

export function setJob(versionId: string, kind: string, status: JobStatus, error: string | null = null): void {
  db.prepare(
    `INSERT INTO jobs (version_id, kind, status, error, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(version_id, kind) DO UPDATE SET status = excluded.status, error = excluded.error, updated_at = excluded.updated_at`
  ).run(versionId, kind, status, error, new Date().toISOString());
}

export function getJob(versionId: string, kind: string): Job | undefined {
  return db.prepare("SELECT * FROM jobs WHERE version_id = ? AND kind = ?").get(versionId, kind) as Job | undefined;
}

/** Versions of this idea with a RECENT running job (so the client can resume polling).
 * Older "running" rows are treated as stale (e.g. the server restarted mid-job). */
export function runningJobsForIdea(ideaId: string): { version_id: string; kind: string }[] {
  const rows = db
    .prepare(
      `SELECT j.version_id, j.kind, j.updated_at FROM jobs j
       JOIN versions v ON v.id = j.version_id
       WHERE v.idea_id = ? AND j.status = 'running'`
    )
    .all(ideaId) as { version_id: string; kind: string; updated_at: string }[];
  const cutoff = new Date(Date.now() - 8 * 60 * 1000).toISOString();
  return rows.filter((r) => r.updated_at > cutoff).map(({ version_id, kind }) => ({ version_id, kind }));
}

// ---- versions ----------------------------------------------------------------
export function listVersions(ideaId: string): Version[] {
  return db
    .prepare("SELECT * FROM versions WHERE idea_id = ? ORDER BY n ASC")
    .all(ideaId) as Version[];
}

export function getVersion(versionId: string): Version | undefined {
  return db.prepare("SELECT * FROM versions WHERE id = ?").get(versionId) as
    | Version
    | undefined;
}

// Delete a version and everything keyed to it. Refuses to delete the original (n=1)
// so cleanup can't nuke important history.
export function deleteVersion(versionId: string): boolean {
  const v = getVersion(versionId);
  if (!v || v.n === 1) return false;
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM artifacts WHERE version_id = ?").run(versionId);
    db.prepare("DELETE FROM messages WHERE version_id = ?").run(versionId);
    db.prepare("DELETE FROM usage_log WHERE version_id = ?").run(versionId);
    db.prepare("DELETE FROM evidence WHERE version_id = ?").run(versionId);
    db.prepare("DELETE FROM versions WHERE id = ?").run(versionId);
  });
  tx();
  return true;
}

export function createVersion(
  ideaId: string,
  opts: {
    statement: string;
    label?: string | null;
    origin: VersionOrigin;
    parentId?: string | null;
    rationale?: string | null;
    context?: string | null;
  }
): Version {
  const row = db.prepare("SELECT MAX(n) AS maxN FROM versions WHERE idea_id = ?").get(ideaId) as {
    maxN: number | null;
  };
  const version: Version = {
    id: crypto.randomUUID(),
    idea_id: ideaId,
    n: (row.maxN ?? 0) + 1,
    statement: opts.statement,
    label: opts.label ?? null,
    origin: opts.origin,
    parent_id: opts.parentId ?? null,
    rationale: opts.rationale ?? null,
    context: opts.context ?? null,
    score: null,
    revenue: null,
    archived: 0,
    created_at: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO versions (id, idea_id, n, statement, label, origin, parent_id, rationale, context, score, revenue, created_at)
     VALUES (@id, @idea_id, @n, @statement, @label, @origin, @parent_id, @rationale, @context, @score, @revenue, @created_at)`
  ).run(version);
  return version;
}

export function setVersionScore(versionId: string, score: number): void {
  db.prepare("UPDATE versions SET score = ? WHERE id = ?").run(Math.round(score), versionId);
}

// Archive (or un-archive) a version — the cleanup path hides intermediate tries without
// destroying them. Refuses to archive the original (n=1), exactly like deleteVersion, so
// cleanup can't hide important history. Un-archiving (archived=0) is always allowed.
// Returns whether the change was applied.
export function setVersionArchived(versionId: string, archived: boolean): boolean {
  if (archived) {
    const v = getVersion(versionId);
    if (!v || v.n === 1) return false;
  }
  db.prepare("UPDATE versions SET archived = ? WHERE id = ?").run(archived ? 1 : 0, versionId);
  return true;
}

// Every non-archived, scored version across ALL ideas — the population the current
// version's score is ranked against for a percentile (the UI plots where this idea sits).
export function scoreDistribution(): number[] {
  const rows = db
    .prepare("SELECT score FROM versions WHERE score IS NOT NULL AND archived = 0")
    .all() as { score: number }[];
  return rows.map((r) => r.score);
}

export function setVersionRevenue(versionId: string, revenue: string): void {
  db.prepare("UPDATE versions SET revenue = ? WHERE id = ?").run(revenue, versionId);
}

// ---- artifacts (version-keyed) ----------------------------------------------
export function saveArtifact(
  versionId: string,
  kind: ArtifactKind,
  data: unknown,
  sources: Source[],
  model: string | null,
  usage?: Usage
): Artifact {
  const row: ArtifactRow = {
    id: crypto.randomUUID(),
    version_id: versionId,
    kind,
    data_json: JSON.stringify(data),
    sources_json: JSON.stringify(sources ?? []),
    model,
    cost: usage?.cost ?? null,
    created_at: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO artifacts (id, version_id, kind, data_json, sources_json, model, cost, prompt_tokens, completion_tokens, created_at)
     VALUES (@id, @version_id, @kind, @data_json, @sources_json, @model, @cost, @prompt_tokens, @completion_tokens, @created_at)
     ON CONFLICT (version_id, kind) DO UPDATE SET
       data_json = excluded.data_json, sources_json = excluded.sources_json,
       model = excluded.model, cost = excluded.cost,
       prompt_tokens = excluded.prompt_tokens, completion_tokens = excluded.completion_tokens,
       created_at = excluded.created_at`
  ).run({
    ...row,
    prompt_tokens: usage?.prompt_tokens ?? null,
    completion_tokens: usage?.completion_tokens ?? null,
  });
  return rowToArtifact(row);
}

// One row per LLM call (generations AND refines) — the source of truth for spend.
export function logUsage(entry: {
  ideaId: string | null;
  versionId: string | null;
  kind: string;
  model: string | null;
  usage: Usage;
}): void {
  db.prepare(
    `INSERT INTO usage_log (id, idea_id, version_id, kind, model, prompt_tokens, completion_tokens, cost, created_at)
     VALUES (@id, @idea_id, @version_id, @kind, @model, @prompt_tokens, @completion_tokens, @cost, @created_at)`
  ).run({
    id: crypto.randomUUID(),
    idea_id: entry.ideaId,
    version_id: entry.versionId,
    kind: entry.kind,
    model: entry.model,
    prompt_tokens: entry.usage.prompt_tokens,
    completion_tokens: entry.usage.completion_tokens,
    cost: entry.usage.cost,
    created_at: new Date().toISOString(),
  });
}

export function getIdeaCost(ideaId: string): number {
  const r = db
    .prepare("SELECT COALESCE(SUM(cost), 0) AS c FROM usage_log WHERE idea_id = ?")
    .get(ideaId) as { c: number };
  return r.c ?? 0;
}

export function getArtifacts(versionId: string): Artifact[] {
  const rows = db
    .prepare("SELECT * FROM artifacts WHERE version_id = ?")
    .all(versionId) as ArtifactRow[];
  return rows.map(rowToArtifact);
}

// All artifacts for an idea, grouped by version id (for the workspace).
export function getArtifactsByVersion(ideaId: string): Record<string, Artifact[]> {
  const rows = db
    .prepare(
      `SELECT a.* FROM artifacts a JOIN versions v ON v.id = a.version_id WHERE v.idea_id = ?`
    )
    .all(ideaId) as ArtifactRow[];
  const out: Record<string, Artifact[]> = {};
  for (const r of rows) (out[r.version_id] ??= []).push(rowToArtifact(r));
  return out;
}

export function getArtifact(versionId: string, kind: ArtifactKind): Artifact | undefined {
  const row = db
    .prepare("SELECT * FROM artifacts WHERE version_id = ? AND kind = ?")
    .get(versionId, kind) as ArtifactRow | undefined;
  return row ? rowToArtifact(row) : undefined;
}

// ---- evidence (version-keyed fetched corpus) ----------------------------------
export function getEvidence(versionId: string): EvidenceCorpus | undefined {
  const row = db.prepare("SELECT data FROM evidence WHERE version_id = ?").get(versionId) as
    | { data: string }
    | undefined;
  return row ? (JSON.parse(row.data) as EvidenceCorpus) : undefined;
}

export function saveEvidence(versionId: string, corpus: EvidenceCorpus): void {
  db.prepare(
    `INSERT INTO evidence (version_id, data, created_at) VALUES (?, ?, ?)
     ON CONFLICT (version_id) DO UPDATE SET data = excluded.data, created_at = excluded.created_at`
  ).run(versionId, JSON.stringify(corpus), Date.now());
}

export function deleteEvidence(versionId: string): void {
  db.prepare("DELETE FROM evidence WHERE version_id = ?").run(versionId);
}

// All evidence corpora for an idea, keyed by version id (for the workspace).
export function getEvidenceByVersion(ideaId: string): Record<string, EvidenceCorpus> {
  const rows = db
    .prepare(
      "SELECT e.version_id, e.data FROM evidence e JOIN versions v ON v.id = e.version_id WHERE v.idea_id = ?"
    )
    .all(ideaId) as { version_id: string; data: string }[];
  const out: Record<string, EvidenceCorpus> = {};
  for (const r of rows) out[r.version_id] = JSON.parse(r.data) as EvidenceCorpus;
  return out;
}

// ---- chat (ask about the analysis) ------------------------------------------
export type Message = {
  id: string;
  version_id: string;
  role: "user" | "assistant";
  text: string;
  created_at: string;
};

export function addMessage(versionId: string, role: "user" | "assistant", text: string): Message {
  const m: Message = {
    id: crypto.randomUUID(),
    version_id: versionId,
    role,
    text,
    created_at: new Date().toISOString(),
  };
  db.prepare(
    "INSERT INTO messages (id, version_id, role, text, created_at) VALUES (@id, @version_id, @role, @text, @created_at)"
  ).run(m);
  return m;
}

export function getMessages(versionId: string): Message[] {
  return db
    .prepare("SELECT * FROM messages WHERE version_id = ? ORDER BY created_at ASC")
    .all(versionId) as Message[];
}
