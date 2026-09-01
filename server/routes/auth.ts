import express, { Request, Response } from 'express';
import { db } from '../db.js';
import { AUTH_COOKIE_NAME, signToken, toPublicUser, verifyPassword, verifyToken } from '../auth/authService.js';
import { recordAuditLog } from '../auth/auditLog.js';

export const authRouter = express.Router();

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // matches the 7d JWT TTL in authService.ts

authRouter.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password are required' });
  }

  const user = db.getAppUserByUsername(username);
  if (!user || user.status !== 'active' || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ success: false, error: 'Invalid username or password' });
  }

  db.updateAppUser(user.id, { lastLoginAt: new Date().toISOString() });
  recordAuditLog({ userId: user.id, username: user.username, role: user.role, action: 'auth.login', targetType: 'session' });

  const token = signToken(user);
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_MS
  });

  res.json({ success: true, user: toPublicUser(user) });
});

authRouter.post('/logout', (req: Request, res: Response) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  const payload = token ? verifyToken(token) : null;
  if (payload) {
    const user = db.getAppUserById(payload.sub);
    if (user) {
      recordAuditLog({ userId: user.id, username: user.username, role: user.role, action: 'auth.logout', targetType: 'session' });
    }
  }

  res.clearCookie(AUTH_COOKIE_NAME);
  res.json({ success: true });
});

// Public (not gated by requireAuth) - lets the client silently check for an
// existing session on load without treating "not logged in" as an error.
authRouter.get('/me', (req: Request, res: Response) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    return res.json({ success: true, user: null });
  }

  const user = db.getAppUserById(payload.sub);
  if (!user || user.status !== 'active') {
    return res.json({ success: true, user: null });
  }

  res.json({ success: true, user: toPublicUser(user) });
});
