import type { Migration } from '../migrationRunner.js';

// Unlike the other 9 tables, audit_logs is NOT mirrored into the in-memory
// DatabaseSchema / full-snapshot-rewrite pattern (see server/db.ts) - it's
// write-heavy (one row per mutating action, plus every login/logout) and
// append-only, so it's read/written directly via SQL instead, to avoid
// making every other write in the app pay for rewriting a growing log table.
export const migration003AddAuditLogs: Migration = {
  id: '003_add_audit_logs',
  up(sqlite) {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        username TEXT NOT NULL,
        role TEXT NOT NULL,
        action TEXT NOT NULL,
        targetType TEXT NOT NULL,
        targetId TEXT,
        detail TEXT,
        timestamp TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_userId ON audit_logs(userId);
    `);
  }
};
