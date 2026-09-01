import express, { Request, Response } from 'express';
import { db } from '../db.js';
import { hashPassword, toPublicUser } from '../auth/authService.js';
import { requireRole } from '../auth/authMiddleware.js';
import { logAction } from '../auth/auditLog.js';
import { AppRole, AppUser } from '../types.js';

export const accountsRouter = express.Router();

const VALID_ROLES: AppRole[] = ['super-admin', 'admin', 'viewer', 'scoped-viewer'];

// Super-admin can fully manage every account. An 'admin' may also reach this
// router, but only to create/manage 'scoped-viewer' accounts they personally
// created, auto-scoped to their own assigned routers - never another role,
// never another admin's account. Enforced per-handler below, not here.
accountsRouter.use(requireRole('super-admin', 'admin'));

function countOtherActiveSuperAdmins(excludeId: string): number {
  return db.getAppUsers().filter((u) => u.role === 'super-admin' && u.status === 'active' && u.id !== excludeId).length;
}

accountsRouter.get('/', (req: Request, res: Response) => {
  try {
    const all = db.getAppUsers();
    const visible =
      req.user!.role === 'super-admin'
        ? all
        : all.filter((u) => u.role === 'scoped-viewer' && u.createdBy === req.user!.id);
    res.json({ success: true, accounts: visible.map(toPublicUser) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

accountsRouter.post('/', (req: Request, res: Response) => {
  try {
    const isSuperAdmin = req.user!.role === 'super-admin';
    const { username, password } = req.body || {};
    let { role, assignedRouterIds } = req.body || {};

    const trimmedUsername = typeof username === 'string' ? username.trim() : '';
    if (!trimmedUsername) {
      return res.status(400).json({ success: false, error: 'Username is required.' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    }

    if (!isSuperAdmin) {
      // An 'admin' may only create 'scoped-viewer' accounts, auto-assigned to
      // their own routers - client-supplied role/assignedRouterIds are ignored.
      role = 'scoped-viewer';
      assignedRouterIds = req.user!.assignedRouterIds;
    } else {
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ success: false, error: 'Invalid role.' });
      }
      if (assignedRouterIds !== undefined && !Array.isArray(assignedRouterIds)) {
        return res.status(400).json({ success: false, error: 'assignedRouterIds must be an array.' });
      }
    }

    if (db.getAppUserByUsername(trimmedUsername)) {
      return res.status(409).json({ success: false, error: 'That username is already taken.' });
    }

    const created = db.addAppUser({
      username: trimmedUsername,
      passwordHash: hashPassword(password),
      role,
      assignedRouterIds: Array.isArray(assignedRouterIds) ? assignedRouterIds : [],
      status: 'active',
      createdBy: req.user!.id
    });

    logAction(req, 'account.create', 'account', created.id, `Created account "${created.username}" (role: ${created.role})`);
    res.status(201).json({ success: true, account: toPublicUser(created) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

accountsRouter.patch('/:id', (req: Request, res: Response) => {
  try {
    const isSuperAdmin = req.user!.role === 'super-admin';
    const existing = db.getAppUserById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Account not found.' });
    }

    if (!isSuperAdmin && (existing.role !== 'scoped-viewer' || existing.createdBy !== req.user!.id)) {
      return res.status(403).json({ success: false, error: 'Not permitted to manage this account.' });
    }

    const { role, assignedRouterIds, status, password } = req.body || {};
    const updates: Partial<AppUser> = {};

    if (role !== undefined) {
      if (!isSuperAdmin) {
        return res.status(403).json({ success: false, error: 'Only a super-admin can change an account role.' });
      }
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ success: false, error: 'Invalid role.' });
      }
      updates.role = role;
    }
    if (assignedRouterIds !== undefined) {
      if (!Array.isArray(assignedRouterIds)) {
        return res.status(400).json({ success: false, error: 'assignedRouterIds must be an array.' });
      }
      if (!isSuperAdmin && assignedRouterIds.some((id: string) => !req.user!.assignedRouterIds.includes(id))) {
        return res.status(403).json({ success: false, error: 'Cannot assign a router outside your own assignment.' });
      }
      updates.assignedRouterIds = assignedRouterIds;
    }
    if (status !== undefined) {
      if (status !== 'active' && status !== 'disabled') {
        return res.status(400).json({ success: false, error: 'Invalid status.' });
      }
      updates.status = status;
    }
    if (password !== undefined) {
      if (typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
      }
      updates.passwordHash = hashPassword(password);
    }

    // Lockout guard: if this account is currently an active super-admin and
    // this update would make it not one, at least one other active
    // super-admin must still exist afterward. (Only reachable by a
    // super-admin caller anyway, since role changes are blocked for admins
    // above - kept as defense in depth.)
    const wasActiveSuperAdmin = existing.role === 'super-admin' && existing.status === 'active';
    const effectiveRole = updates.role ?? existing.role;
    const effectiveStatus = updates.status ?? existing.status;
    const staysActiveSuperAdmin = effectiveRole === 'super-admin' && effectiveStatus === 'active';
    if (wasActiveSuperAdmin && !staysActiveSuperAdmin && countOtherActiveSuperAdmins(existing.id) === 0) {
      return res.status(400).json({ success: false, error: 'Cannot remove the last active super-admin account.' });
    }

    const updated = db.updateAppUser(req.params.id, updates)!;

    const changeDescriptions: string[] = [];
    if (updates.role !== undefined) changeDescriptions.push(`role -> ${updates.role}`);
    if (updates.status !== undefined) changeDescriptions.push(`status -> ${updates.status}`);
    if (updates.assignedRouterIds !== undefined) changeDescriptions.push(`assigned routers -> [${updates.assignedRouterIds.join(', ')}]`);
    if (updates.passwordHash !== undefined) changeDescriptions.push('password reset');
    logAction(req, 'account.update', 'account', updated.id, `Updated account "${updated.username}": ${changeDescriptions.join(', ')}`);

    res.json({ success: true, account: toPublicUser(updated) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
