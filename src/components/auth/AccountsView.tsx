import React, { useEffect, useState } from 'react';
import { PublicAppUser, RouterRecord, AppRole } from '../../types';
import { UserPlus, ShieldCheck, ShieldOff, KeyRound, X } from 'lucide-react';
import { api } from '../../api';

interface AccountsViewProps {
  routers: RouterRecord[];
  currentUserId: string;
  isSuperAdmin: boolean;
}

const ROLE_LABEL: Record<AppRole, string> = {
  'super-admin': 'Super-Admin',
  admin: 'Admin',
  viewer: 'Viewer — All Routers',
  'scoped-viewer': 'Viewer — Assigned Routers'
};

// Both 'admin' and 'scoped-viewer' are limited to assignedRouterIds; the
// other two roles see every router.
const isScopedRole = (role: AppRole) => role === 'admin' || role === 'scoped-viewer';

export const AccountsView: React.FC<AccountsViewProps> = ({ routers, currentUserId, isSuperAdmin }) => {
  const [accounts, setAccounts] = useState<PublicAppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<PublicAppUser | null>(null);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await api.getAccounts();
      setAccounts(res);
    } catch (e: any) {
      setError(e.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleToggleStatus = async (account: PublicAppUser) => {
    try {
      await api.updateAccount(account.id, { status: account.status === 'active' ? 'disabled' : 'active' });
      fetchAccounts();
    } catch (e: any) {
      window.alert(e.message || 'Failed to update account');
    }
  };

  const routerName = (id: string) => routers.find((r) => r.id === id)?.name || id;

  return (
    <div className="flex-1 flex flex-col space-y-5 max-w-[1200px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#c2c6d3] pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#141d23] tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-[#003d7c]" />
            <span>Account Management</span>
          </h1>
          <p className="text-xs md:text-sm text-[#424751] mt-0.5">
            {isSuperAdmin
              ? 'Create and manage dashboard login accounts and their roles'
              : 'Create read-only viewer accounts scoped to your assigned routers'}
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-[#003d7c] text-white rounded-lg text-sm font-semibold hover:bg-[#0054a6] transition-colors shadow-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>{isSuperAdmin ? 'New Account' : 'New Viewer'}</span>
        </button>
      </div>

      {error && (
        <p className="text-xs font-semibold text-[#ba1a1a] bg-[#fdecea] border border-[#f3c2bd] rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="bg-white border border-[#c2c6d3] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#e6eff8] border-b border-[#c2c6d3] text-[11px] font-bold text-[#727783] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Assigned Routers</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dbe4ed]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-[#727783]">
                    Loading accounts...
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-[#727783]">
                    No accounts found.
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-[#ecf5fe] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#141d23]">
                      {account.username}
                      {account.id === currentUserId && (
                        <span className="ml-2 text-[10px] font-bold text-[#0054a6] uppercase">You</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block bg-[#e6eff8] text-[#003d7c] text-xs font-semibold px-2 py-0.5 rounded border border-[#c2c6d3]">
                        {ROLE_LABEL[account.role]}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-[#424751]">
                      {!isScopedRole(account.role)
                        ? 'All routers'
                        : account.assignedRouterIds.length === 0
                        ? '—'
                        : account.assignedRouterIds.map(routerName).join(', ')}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-bold ${
                          account.status === 'active' ? 'text-[#006e25]' : 'text-[#727783]'
                        }`}
                      >
                        {account.status === 'active' ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-[#727783]">
                      {account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setAccountToEdit(account)}
                          className="px-2.5 py-1 text-xs font-semibold text-[#003d7c] bg-[#e6eff8] hover:bg-[#dbe4ed] rounded transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(account)}
                          title={account.status === 'active' ? 'Disable account' : 'Enable account'}
                          className={`p-1.5 rounded transition-colors ${
                            account.status === 'active'
                              ? 'text-[#ba1a1a] hover:bg-[#ffdad6]'
                              : 'text-[#006e25] hover:bg-[#d7f2de]'
                          }`}
                        >
                          {account.status === 'active' ? (
                            <ShieldOff className="w-4 h-4" />
                          ) : (
                            <ShieldCheck className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <AccountModal
          routers={routers}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setShowCreateModal(false)}
          onSaved={() => {
            setShowCreateModal(false);
            fetchAccounts();
          }}
        />
      )}

      {accountToEdit && (
        <AccountModal
          routers={routers}
          isSuperAdmin={isSuperAdmin}
          account={accountToEdit}
          onClose={() => setAccountToEdit(null)}
          onSaved={() => {
            setAccountToEdit(null);
            fetchAccounts();
          }}
        />
      )}
    </div>
  );
};

interface AccountModalProps {
  routers: RouterRecord[];
  isSuperAdmin: boolean;
  account?: PublicAppUser;
  onClose: () => void;
  onSaved: () => void;
}

const AccountModal: React.FC<AccountModalProps> = ({ routers, isSuperAdmin, account, onClose, onSaved }) => {
  const isEdit = !!account;
  // A non-super-admin (i.e. 'admin') can only ever create/edit 'scoped-viewer'
  // accounts - the role is fixed and never shown as an editable field.
  const [username, setUsername] = useState(account?.username || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AppRole>(account?.role || (isSuperAdmin ? 'viewer' : 'scoped-viewer'));
  const [assignedRouterIds, setAssignedRouterIds] = useState<string[]>(account?.assignedRouterIds || []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showRouterPicker = isSuperAdmin && isScopedRole(role);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isEdit) {
        const updates: { role?: AppRole; assignedRouterIds?: string[]; password?: string } = {};
        if (isSuperAdmin) {
          updates.role = role;
          updates.assignedRouterIds = isScopedRole(role) ? assignedRouterIds : [];
        } else if (role === 'scoped-viewer') {
          updates.assignedRouterIds = assignedRouterIds;
        }
        if (password) updates.password = password;
        await api.updateAccount(account!.id, updates);
      } else {
        if (!username.trim()) throw new Error('Username is required.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        await api.createAccount({
          username: username.trim(),
          password,
          role,
          assignedRouterIds: isScopedRole(role) ? assignedRouterIds : []
        });
      }
      onSaved();
    } catch (e: any) {
      setError(e.message || 'Failed to save account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#141d23]">
            {isEdit ? `Edit "${account!.username}"` : isSuperAdmin ? 'New Account' : 'New Viewer'}
          </h2>
          <button onClick={onClose} className="text-[#727783] hover:text-[#141d23]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {!isEdit && (
            <div>
              <label className="text-[11px] font-bold text-[#727783] uppercase tracking-wider block mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-[#c2c6d3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0054a6]"
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-[#727783] uppercase tracking-wider block mb-1 flex items-center gap-1">
              <KeyRound className="w-3 h-3" />
              {isEdit ? 'Reset Password (optional)' : 'Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? 'Leave blank to keep current password' : ''}
              required={!isEdit}
              className="w-full px-3 py-2 text-sm border border-[#c2c6d3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0054a6]"
            />
          </div>

          {isSuperAdmin ? (
            <div>
              <label className="text-[11px] font-bold text-[#727783] uppercase tracking-wider block mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as AppRole)}
                className="w-full px-3 py-2 text-sm border border-[#c2c6d3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0054a6] bg-white"
              >
                <option value="super-admin">Super-Admin — full access</option>
                <option value="admin">Admin — scoped to assigned routers</option>
                <option value="viewer">Viewer — read-only, all routers</option>
                <option value="scoped-viewer">Viewer — read-only, assigned routers</option>
              </select>
            </div>
          ) : (
            <p className="text-xs text-[#727783] bg-[#e6eff8] border border-[#c2c6d3] rounded-lg px-3 py-2">
              This account will be a read-only viewer, automatically scoped to your assigned routers.
            </p>
          )}

          {(showRouterPicker || (!isSuperAdmin && role === 'scoped-viewer' && isEdit)) && (
            <div>
              <label className="text-[11px] font-bold text-[#727783] uppercase tracking-wider block mb-1">
                Assigned Routers
              </label>
              <select
                multiple
                value={assignedRouterIds}
                onChange={(e) =>
                  setAssignedRouterIds(Array.from(e.target.selectedOptions, (o) => o.value))
                }
                className="w-full px-3 py-2 text-sm border border-[#c2c6d3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0054a6] h-32"
              >
                {routers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.publicIp})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-[#727783] mt-1">Ctrl/Cmd-click to select multiple.</p>
            </div>
          )}

          {error && (
            <p className="text-xs font-semibold text-[#ba1a1a] bg-[#fdecea] border border-[#f3c2bd] rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-[#424751] hover:bg-[#e6eff8] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-[#003d7c] hover:bg-[#0054a6] disabled:opacity-60 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
