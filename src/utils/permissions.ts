import { PublicAppUser } from '../types';

// Mirrors server/auth/permissions.ts - used only to hide/disable actions the
// backend would reject anyway; the server remains the actual enforcement point.
export function canMutate(user: PublicAppUser | null): boolean {
  return !!user && (user.role === 'super-admin' || user.role === 'admin');
}

export function isSuperAdmin(user: PublicAppUser | null): boolean {
  return user?.role === 'super-admin';
}

export function canManageAccounts(user: PublicAppUser | null): boolean {
  return !!user && (user.role === 'super-admin' || user.role === 'admin');
}

export function hasRouterAccess(user: PublicAppUser | null, routerId: string): boolean {
  if (!user) return false;
  if (user.role !== 'admin' && user.role !== 'scoped-viewer') return true;
  return user.assignedRouterIds.includes(routerId);
}
