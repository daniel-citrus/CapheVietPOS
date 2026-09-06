import { config } from "../config";
import type { AuditLog } from "./AuditLog";
import { SqliteAuditLog } from "./SqliteAuditLog";

export const auditLog: AuditLog = new SqliteAuditLog(config.sqlitePath);
