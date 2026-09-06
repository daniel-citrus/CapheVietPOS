import type { AuditEntry } from "shared/api";

/**
 * Append-only record of every mutation. One implementation today
 * (`SqliteAuditLog`); a `PostgresAuditLog` slots in behind the same interface
 * later with no caller changes.
 */
export interface AuditLog {
  /** `id` and `at` are filled in by the implementation. */
  record(entry: Omit<AuditEntry, "id" | "at">): void;
  /** Most recent first. */
  list(opts?: { limit?: number }): AuditEntry[];
}
