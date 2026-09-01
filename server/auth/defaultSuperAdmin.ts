// Shared between the one-time seed migration (server/db/migrations/002_seed_super_admin.ts)
// and the manual recovery script (server/auth/seedSuperAdmin.ts) so the
// default credentials live in exactly one place.
export const DEFAULT_SUPER_ADMIN_USERNAME = 'super-admin';
export const DEFAULT_SUPER_ADMIN_PASSWORD = '123456789';
