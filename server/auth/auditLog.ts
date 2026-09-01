import { Request } from 'express';
import { db } from '../db.js';
import { AppRole } from '../types.js';

export function recordAuditLog(entry: {
  userId: string;
  username: string;
  role: AppRole;
  action: string;
  targetType: string;
  targetId?: string;
  detail?: string;
}): void {
  db.addAuditLog(entry);
}

// Convenience for the common case: logging a mutating action from inside an
// already-authenticated route handler (req.user is set by requireAuth).
export function logAction(req: Request, action: string, targetType: string, targetId?: string, detail?: string): void {
  if (!req.user) return;
  recordAuditLog({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.role,
    action,
    targetType,
    targetId,
    detail
  });
}
