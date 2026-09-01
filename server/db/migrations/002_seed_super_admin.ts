import type { Migration } from '../migrationRunner.js';
import { hashPassword } from '../../auth/authService.js';
import { DEFAULT_SUPER_ADMIN_USERNAME, DEFAULT_SUPER_ADMIN_PASSWORD } from '../../auth/defaultSuperAdmin.js';

// Runs exactly once, ever, on any database - tracked in schema_migrations
// like any other migration, not re-checked against current app_users state.
// This is deliberate: if a super-admin later deletes every account, restarting
// the server must NOT silently resurrect this one. Use
// `npm run seed:super-admin` (server/auth/seedSuperAdmin.ts) for that
// break-glass case instead.
//
// Uses INSERT OR IGNORE (keyed on the UNIQUE username column) rather than a
// plain INSERT: a database that already had this feature running before
// migrations existed may already have a 'super-admin' row, and this migration
// must not fail - or duplicate it - when it runs there for the first time.
export const migration002SeedSuperAdmin: Migration = {
  id: '002_seed_super_admin',
  up(sqlite) {
    const now = new Date().toISOString();
    const result = sqlite
      .prepare(`
        INSERT OR IGNORE INTO app_users (id, username, passwordHash, role, assignedRouterIds, status, createdAt, updatedAt, lastLoginAt)
        VALUES (@id, @username, @passwordHash, 'super-admin', '[]', 'active', @createdAt, @updatedAt, NULL)
      `)
      .run({
        id: `au-${Date.now()}`,
        username: DEFAULT_SUPER_ADMIN_USERNAME,
        passwordHash: hashPassword(DEFAULT_SUPER_ADMIN_PASSWORD),
        createdAt: now,
        updatedAt: now
      });
    if (result.changes > 0) {
      console.log(
        `[Auth] Seeded default super-admin account (username: "${DEFAULT_SUPER_ADMIN_USERNAME}"). ` +
          'Change this password after first login.'
      );
    }
  }
};
