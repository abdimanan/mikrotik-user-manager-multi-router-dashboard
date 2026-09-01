import type SqliteDatabase from 'better-sqlite3';

export interface Migration {
  // Numeric prefix decides run order (e.g. '001_init_schema'); the full id is
  // recorded in schema_migrations, so renaming an already-applied migration
  // file makes it re-run - keep ids stable once shipped.
  id: string;
  up: (sqlite: SqliteDatabase.Database) => void;
}

// Applies every migration not yet recorded in schema_migrations, in array
// order, each in its own transaction. Safe to call on every startup - already
// applied migrations are skipped, and a fresh database just runs all of them.
export function runMigrations(sqlite: SqliteDatabase.Database, migrations: Migration[]): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      appliedAt TEXT NOT NULL
    );
  `);

  const applied = new Set(
    (sqlite.prepare('SELECT id FROM schema_migrations').all() as { id: string }[]).map((r) => r.id)
  );

  for (const migration of migrations) {
    if (applied.has(migration.id)) continue;

    const run = sqlite.transaction(() => {
      migration.up(sqlite);
      sqlite.prepare('INSERT INTO schema_migrations (id, appliedAt) VALUES (?, ?)').run(migration.id, new Date().toISOString());
    });
    run();
    console.log(`[DB] Applied migration: ${migration.id}`);
  }
}
