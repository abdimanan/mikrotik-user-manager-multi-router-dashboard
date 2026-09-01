import type { Migration } from '../migrationRunner.js';

// Adds AppUser.createdBy: lets an 'admin' manage only the 'scoped-viewer'
// accounts they personally created (server/routes/accounts.ts). Existing rows
// get NULL - accounts created before this migration have no recorded creator,
// which only matters for the (new) admin-manages-what-they-created feature.
export const migration004AddAppUserCreatedBy: Migration = {
  id: '004_add_app_user_created_by',
  up(sqlite) {
    const columns = sqlite.prepare("PRAGMA table_info(app_users)").all() as { name: string }[];
    if (!columns.some((c) => c.name === 'createdBy')) {
      sqlite.exec('ALTER TABLE app_users ADD COLUMN createdBy TEXT');
    }
  }
};
