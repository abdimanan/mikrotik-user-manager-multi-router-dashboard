import type { Migration } from '../migrationRunner.js';
import { migration001InitSchema } from './001_init_schema.js';
import { migration002SeedSuperAdmin } from './002_seed_super_admin.js';
import { migration003AddAuditLogs } from './003_add_audit_logs.js';
import { migration004AddAppUserCreatedBy } from './004_add_app_user_created_by.js';

// Applied in this exact order. Add new migrations to the end of this array -
// never reorder or remove an already-shipped entry.
export const migrations: Migration[] = [
  migration001InitSchema,
  migration002SeedSuperAdmin,
  migration003AddAuditLogs,
  migration004AddAppUserCreatedBy
];
