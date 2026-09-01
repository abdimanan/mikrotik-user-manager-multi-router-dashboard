import { fileURLToPath } from 'url';
import { db } from '../db.js';
import { hashPassword } from './authService.js';
import { DEFAULT_SUPER_ADMIN_USERNAME, DEFAULT_SUPER_ADMIN_PASSWORD } from './defaultSuperAdmin.js';

// Break-glass recovery tool, NOT run automatically on startup - the initial
// super-admin account is created once, ever, by the
// '002_seed_super_admin' migration (server/db/migrations). This script exists
// for the case where every dashboard account has since been deleted (e.g. by
// mistake) and there's no other way back in. Run with `npm run seed:super-admin`.
export function seedSuperAdminAccount(): void {
  if (db.getAppUsers().length > 0) {
    console.log('[Auth] Accounts already exist - not creating a new super-admin. Delete all accounts first if you intend to reset access.');
    return;
  }

  db.addAppUser({
    username: DEFAULT_SUPER_ADMIN_USERNAME,
    passwordHash: hashPassword(DEFAULT_SUPER_ADMIN_PASSWORD),
    role: 'super-admin',
    assignedRouterIds: [],
    status: 'active'
  });

  console.log(
    `[Auth] Created recovery super-admin account (username: "${DEFAULT_SUPER_ADMIN_USERNAME}"). ` +
      'Change this password after logging in.'
  );
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  seedSuperAdminAccount();
}
