import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import type { AuditEntry } from "shared/api";
import type { AuditLog } from "./AuditLog";

/**
 * SQLite-backed audit log. One append-only table, created on construction.
 * Swappable for Postgres later — the SQL here is deliberately plain.
 */
export class SqliteAuditLog implements AuditLog {
  private db: Database.Database;

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id          TEXT PRIMARY KEY,
        at          TEXT NOT NULL,
        actor_role  TEXT NOT NULL,
        actor_id    TEXT NOT NULL,
        action      TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id   TEXT NOT NULL,
        summary     TEXT NOT NULL,
        before_json TEXT,
        after_json  TEXT
      );
      CREATE INDEX IF NOT EXISTS audit_log_at ON audit_log (at DESC);
    `);
  }

  record(entry: Omit<AuditEntry, "id" | "at">): void {
    this.db
      .prepare(
        `INSERT INTO audit_log
           (id, at, actor_role, actor_id, action, entity_type, entity_id, summary, before_json, after_json)
         VALUES (@id, @at, @actorRole, @actorId, @action, @entityType, @entityId, @summary, @before, @after)`,
      )
      .run({
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        actorRole: entry.actorRole,
        actorId: entry.actorId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        summary: entry.summary,
        before: entry.before === undefined ? null : JSON.stringify(entry.before),
        after: entry.after === undefined ? null : JSON.stringify(entry.after),
      });
  }

  list(opts?: { limit?: number }): AuditEntry[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM audit_log ORDER BY at DESC LIMIT ?`,
      )
      .all(Math.min(opts?.limit ?? 100, 500)) as Record<string, string | null>[];

    return rows.map((r) => ({
      id: r.id as string,
      at: r.at as string,
      actorRole: r.actor_role as "admin" | "staff",
      actorId: r.actor_id as string,
      action: r.action as string,
      entityType: r.entity_type as AuditEntry["entityType"],
      entityId: r.entity_id as string,
      summary: r.summary as string,
      before: r.before_json ? JSON.parse(r.before_json) : undefined,
      after: r.after_json ? JSON.parse(r.after_json) : undefined,
    }));
  }
}
