import { PublicAppUser } from '../types.js';

// Only super-admin and admin can create/edit/delete within their scope -
// 'viewer' and 'scoped-viewer' are both read-only, differing only in which
// routers they can see (see routerScopeFor below).
export function canMutate(user: PublicAppUser): boolean {
  return user.role === 'super-admin' || user.role === 'admin';
}

// Only super-admin can add/delete routers or manage dashboard accounts.
export function isSuperAdmin(user: PublicAppUser): boolean {
  return user.role === 'super-admin';
}

// undefined = unrestricted (super-admin, viewer both see every router);
// an array = the exact set of router ids an 'admin' or 'scoped-viewer' may
// see (and, for 'admin' only, act on - see canMutate above).
export function routerScopeFor(user: PublicAppUser): string[] | undefined {
  return user.role === 'admin' || user.role === 'scoped-viewer' ? user.assignedRouterIds : undefined;
}

export function hasRouterAccess(user: PublicAppUser, routerId: string): boolean {
  const scope = routerScopeFor(user);
  return scope === undefined || scope.includes(routerId);
}
