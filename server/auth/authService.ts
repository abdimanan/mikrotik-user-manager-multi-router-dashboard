import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppUser, PublicAppUser } from '../types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'mikrotik_multirouter_dashboard_jwt_dev_secret_2026!';
const TOKEN_TTL = '7d';
export const AUTH_COOKIE_NAME = 'mt_session';

export interface TokenPayload {
  sub: string;
  username: string;
  role: AppUser['role'];
}

export function hashPassword(plainText: string): string {
  return bcrypt.hashSync(plainText, 10);
}

export function verifyPassword(plainText: string, hash: string): boolean {
  return bcrypt.compareSync(plainText, hash);
}

export function signToken(user: AppUser): string {
  const payload: TokenPayload = { sub: user.id, username: user.username, role: user.role };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function toPublicUser(user: AppUser): PublicAppUser {
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}
