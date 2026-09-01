import { Request, Response, NextFunction } from 'express';
import { db } from '../db.js';
import { AppRole, PublicAppUser } from '../types.js';
import { AUTH_COOKIE_NAME, toPublicUser, verifyToken } from './authService.js';
import { hasRouterAccess } from './permissions.js';

declare global {
  namespace Express {
    interface Request {
      user?: PublicAppUser;
    }
  }
}

// Verifies the session cookie AND re-fetches the account from the DB (rather
// than trusting the JWT's role/status claims) so a role change or a disabled
// account takes effect immediately, without waiting for the token to expire.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  const payload = token ? verifyToken(token) : null;
  const user = payload ? db.getAppUserById(payload.sub) : null;

  if (!user || user.status !== 'active') {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  req.user = toPublicUser(user);
  next();
}

// Must run after requireAuth. 403s if the session's role isn't one of `roles`.
export function requireRole(...roles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Not permitted for this account role' });
    }
    next();
  };
}

// Must run after requireAuth. 403s if an 'admin' isn't assigned to the router
// named by req.params[paramName] (default 'id'). No-op for super-admin/viewer.
export function requireRouterAccess(paramName = 'id') {
  return (req: Request, res: Response, next: NextFunction) => {
    const routerId = req.params[paramName];
    if (!req.user || !routerId || !hasRouterAccess(req.user, routerId)) {
      return res.status(403).json({ success: false, error: 'Not permitted for this router' });
    }
    next();
  };
}
