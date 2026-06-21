import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import type { Source } from "./ai/client";

// ---- connection (singleton across dev hot-reloads) ---------------------------
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const globalForDb = globalThis as unknown as { _db?: Database.Database };

function init(): Database.Database {
  const db = new Database(path.join(DATA_DIR, "ideavalidator.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS ideas (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      prompt     TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS artifacts (
      id         TEXT PRIMARY KEY,
      idea_id    TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
      kind       TEXT NOT NULL,
      data_json  TEXT NOT NULL,
      sources_json TEXT NOT NULL DEFAULT '[]',
      model      TEXT,
      created_at TEXT NOT NULL,
      UNIQUE (idea_id, kind)
    );
  `);
  return db;
}

const db = globalForDb._db ?? init();
if (process.env.NODE_ENV !== "production") globalForDb._db = db;

// ---- types -------------------------------------------------------------------
export type ArtifactKind =
  | "validation"
  | "market"
  | "plan"
  | "brand"
  | "logo"
  | "marketing"
  | "pitch";

export type Idea = {
  id: string;
  title: string;
  prompt: string;
  created_at: string;
};

export type Artifact = {
  id: string;
  idea_id: string;
  kind: ArtifactKind;
  data: unknown;
  sources: Source[];
  model: string | null;
  created_at: string;
};

type ArtifactRow = {
  id: string;
  idea_id: string;
  kind: ArtifactKind;
  data_json: string;
  sources_json: string;
  model: string | null;
  created_at: string;
};

function rowToArtifact(r: ArtifactRow): Artifact {
  return {
    id: r.id,
    idea_id: r.idea_id,
    kind: r.kind,
    data: JSON.parse(r.data_json),
    sources: JSON.parse(r.sources_json) as Source[],
    model: r.model,
    created_at: r.created_at,
  };
}

// ---- ideas -------------------------------------------------------------------
export function createIdea(title: string, prompt: string): Idea {
  const idea: Idea = {
    id: crypto.randomUUID(),
    title,
    prompt,
    created_at: new Date().toISOString(),
  };
  db.prepare(
    "INSERT INTO ideas (id, title, prompt, created_at) VALUES (@id, @title, @prompt, @created_at)"
  ).run(idea);
  return idea;
}

export function listIdeas(): Idea[] {
  return db.prepare("SELECT * FROM ideas ORDER BY created_at DESC").all() as Idea[];
}

export function getIdea(id: string): Idea | undefined {
  return db.prepare("SELECT * FROM ideas WHERE id = ?").get(id) as Idea | undefined;
}

export function deleteIdea(id: string): void {
  db.prepare("DELETE FROM artifacts WHERE idea_id = ?").run(id);
  db.prepare("DELETE FROM ideas WHERE id = ?").run(id);
}

// ---- artifacts ---------------------------------------------------------------
export function saveArtifact(
  ideaId: string,
  kind: ArtifactKind,
  data: unknown,
  sources: Source[],
  model: string | null
): Artifact {
  const row: ArtifactRow = {
    id: crypto.randomUUID(),
    idea_id: ideaId,
    kind,
    data_json: JSON.stringify(data),
    sources_json: JSON.stringify(sources ?? []),
    model,
    created_at: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO artifacts (id, idea_id, kind, data_json, sources_json, model, created_at)
     VALUES (@id, @idea_id, @kind, @data_json, @sources_json, @model, @created_at)
     ON CONFLICT (idea_id, kind) DO UPDATE SET
       data_json = excluded.data_json,
       sources_json = excluded.sources_json,
       model = excluded.model,
       created_at = excluded.created_at`
  ).run(row);
  return rowToArtifact(row);
}

export function getArtifacts(ideaId: string): Artifact[] {
  const rows = db
    .prepare("SELECT * FROM artifacts WHERE idea_id = ?")
    .all(ideaId) as ArtifactRow[];
  return rows.map(rowToArtifact);
}

export function getArtifact(
  ideaId: string,
  kind: ArtifactKind
): Artifact | undefined {
  const row = db
    .prepare("SELECT * FROM artifacts WHERE idea_id = ? AND kind = ?")
    .get(ideaId, kind) as ArtifactRow | undefined;
  return row ? rowToArtifact(row) : undefined;
}
