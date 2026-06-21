import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import type { Source } from "./ai/client";

// ---- connection (singleton across dev hot-reloads) ---------------------------
const DATA_DIR = path.join(process.cwd(), "data");
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

function init(): Database.Database {
  const db = new Database(path.join(DATA_DIR, "ideavalidator.db"));
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS ideas (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      prompt     TEXT,
      created_at TEXT NOT NULL
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
      score      INTEGER,
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
export type ArtifactKind =
  | "validation"
  | "market"
  | "financials"
  | "plan"
  | "brand"
  | "logo"
  | "marketing"
  | "pitch";

export type Idea = { id: string; title: string; prompt: string | null; created_at: string };

export type IdeaSummary = Idea & { best_score: number | null; version_count: number };

export type VersionOrigin = "original" | "manual" | "ai";

export type Version = {
  id: string;
  idea_id: string;
  n: number;
  statement: string;
  label: string | null;
  origin: VersionOrigin;
  parent_id: string | null;
  rationale: string | null;
  score: number | null;
  created_at: string;
};

export type Artifact = {
  id: string;
  version_id: string;
  kind: ArtifactKind;
  data: unknown;
  sources: Source[];
  model: string | null;
  created_at: string;
};

type ArtifactRow = {
  id: string;
  version_id: string;
  kind: ArtifactKind;
  data_json: string;
  sources_json: string;
  model: string | null;
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
    created_at: r.created_at,
  };
}

// ---- ideas + initial version -------------------------------------------------
export function createIdea(title: string, statement: string): { idea: Idea; version: Version } {
  const now = new Date().toISOString();
  const idea: Idea = { id: crypto.randomUUID(), title, prompt: statement, created_at: now };
  const version: Version = {
    id: crypto.randomUUID(),
    idea_id: idea.id,
    n: 1,
    statement,
    label: null,
    origin: "original",
    parent_id: null,
    rationale: null,
    score: null,
    created_at: now,
  };
  const tx = db.transaction(() => {
    db.prepare(
      "INSERT INTO ideas (id, title, prompt, created_at) VALUES (@id, @title, @prompt, @created_at)"
    ).run(idea);
    db.prepare(
      `INSERT INTO versions (id, idea_id, n, statement, label, origin, parent_id, rationale, score, created_at)
       VALUES (@id, @idea_id, @n, @statement, @label, @origin, @parent_id, @rationale, @score, @created_at)`
    ).run(version);
  });
  tx();
  return { idea, version };
}

export function listIdeas(): IdeaSummary[] {
  return db
    .prepare(
      `SELECT i.*,
              (SELECT MAX(v.score) FROM versions v WHERE v.idea_id = i.id) AS best_score,
              (SELECT COUNT(*) FROM versions v WHERE v.idea_id = i.id) AS version_count
       FROM ideas i ORDER BY i.created_at DESC`
    )
    .all() as IdeaSummary[];
}

export function getIdea(id: string): Idea | undefined {
  return db.prepare("SELECT * FROM ideas WHERE id = ?").get(id) as Idea | undefined;
}

export function deleteIdea(id: string): void {
  const tx = db.transaction(() => {
    db.prepare(
      "DELETE FROM artifacts WHERE version_id IN (SELECT id FROM versions WHERE idea_id = ?)"
    ).run(id);
    db.prepare("DELETE FROM versions WHERE idea_id = ?").run(id);
    db.prepare("DELETE FROM ideas WHERE id = ?").run(id);
  });
  tx();
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

export function createVersion(
  ideaId: string,
  opts: { statement: string; label?: string | null; origin: VersionOrigin; parentId?: string | null; rationale?: string | null }
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
    score: null,
    created_at: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO versions (id, idea_id, n, statement, label, origin, parent_id, rationale, score, created_at)
     VALUES (@id, @idea_id, @n, @statement, @label, @origin, @parent_id, @rationale, @score, @created_at)`
  ).run(version);
  return version;
}

export function setVersionScore(versionId: string, score: number): void {
  db.prepare("UPDATE versions SET score = ? WHERE id = ?").run(Math.round(score), versionId);
}

// ---- artifacts (version-keyed) ----------------------------------------------
export function saveArtifact(
  versionId: string,
  kind: ArtifactKind,
  data: unknown,
  sources: Source[],
  model: string | null
): Artifact {
  const row: ArtifactRow = {
    id: crypto.randomUUID(),
    version_id: versionId,
    kind,
    data_json: JSON.stringify(data),
    sources_json: JSON.stringify(sources ?? []),
    model,
    created_at: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO artifacts (id, version_id, kind, data_json, sources_json, model, created_at)
     VALUES (@id, @version_id, @kind, @data_json, @sources_json, @model, @created_at)
     ON CONFLICT (version_id, kind) DO UPDATE SET
       data_json = excluded.data_json, sources_json = excluded.sources_json,
       model = excluded.model, created_at = excluded.created_at`
  ).run(row);
  return rowToArtifact(row);
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
