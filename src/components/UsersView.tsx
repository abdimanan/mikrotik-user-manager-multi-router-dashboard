import React, { useState, useEffect } from 'react';
import { RouterRecord, UserManagerUser } from '../types';
import { Search, Plus, Trash2, UserCheck, UserX, Shield, HardDrive, ArrowUpDown, Filter } from 'lucide-react';
import { api } from '../api';

interface UsersViewProps {
  routers: RouterRecord[];
  selectedRouterId?: string;
  canMutate: boolean;
  onSelectRouter: (routerId: string) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({
  routers,
  selectedRouterId,
  canMutate,
  onSelectRouter
}) => {
  const [activeRouterId, setActiveRouterId] = useState<string>(
    selectedRouterId || (routers[0]?.id || '')
  );
  const [users, setUsers] = useState<UserManagerUser[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    profile: 'Standard-20Mbps',
    comment: '',
    price: '0'
  });

  const activeRouter = routers.find((r) => r.id === activeRouterId) || routers[0];

  const fetchUsers = async () => {
    if (!activeRouterId) return;
    setLoading(true);
    try {
      const res = await api.getRouterUsers(activeRouterId);
      setUsers(res.users);
    } catch (e) {
      console.error('Error fetching users:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRouterId) {
      setActiveRouterId(selectedRouterId);
    }
  }, [selectedRouterId]);

  useEffect(() => {
    if (activeRouterId) {
      fetchUsers();
    }
  }, [activeRouterId]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username) return;
    try {
      await api.addUser(activeRouterId, {
        username: newUser.username,
        password: newUser.password || '1234',
        profile: newUser.profile,
        comment: newUser.comment,
        price: parseFloat(newUser.price || '0'),
        status: 'active'
      });
      setShowAddModal(false);
      setNewUser({ username: '', password: '', profile: 'Standard-20Mbps', comment: '', price: '0' });
      fetchUsers();
    } catch (err) {
      console.error('Failed to add user', err);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (window.confirm(`Delete user ${username}?`)) {
      await api.deleteUser(activeRouterId, userId);
      fetchUsers();
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.profile.toLowerCase().includes(search.toLowerCase()) ||
      (u.ipAddress && u.ipAddress.includes(search)) ||
      (u.comment && u.comment.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 flex flex-col space-y-4 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#c2c6d3] pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#141d23] tracking-tight">
            User Manager Users
          </h1>
          <p className="text-xs md:text-sm text-[#424751] mt-0.5">
            Profiles, bandwidth limits, and authentication records
          </p>
        </div>

        {/* Router Selector Dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-[#c2c6d3] rounded-lg shadow-xs">
            <span className="text-xs text-[#727783] font-medium whitespace-nowrap">
              Target Router:
            </span>
            <select
              value={activeRouterId}
              onChange={(e) => setActiveRouterId(e.target.value)}
              className="text-xs md:text-sm font-semibold text-[#003d7c] bg-transparent focus:outline-none cursor-pointer"
            >
              {routers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.publicIp})
                </option>
              ))}
            </select>
          </div>

          {canMutate && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[#003d7c] text-white rounded-lg text-sm font-semibold hover:bg-[#0054a6] transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add User</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#727783]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search username, profile, IP, or comment..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#c2c6d3] rounded-lg text-sm focus:outline-none focus:border-[#003d7c] transition-all"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-[#c2c6d3] text-sm rounded-lg px-3 py-2 text-[#141d23] focus:outline-none focus:border-[#003d7c]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="expired">Expired Only</option>
            <option value="disabled">Disabled Only</option>
            <option value="pending">Pending Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-[#c2c6d3] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#e6eff8] border-b border-[#c2c6d3] text-[11px] font-bold text-[#727783] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Profile</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Uptime</th>
                <th className="py-3 px-4">Download</th>
                <th className="py-3 px-4">Upload</th>
                <th className="py-3 px-4">IP / MAC</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dbe4ed]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-[#727783]">
                    Connecting to RouterOS API...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-[#727783]">
                    No users found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-[#ecf5fe] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#141d23]">
                      <div className="flex flex-col">
                        <span>{user.username}</span>
                        {user.comment && (
                          <span className="text-[11px] text-[#727783] font-normal">
                            {user.comment}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block bg-[#e6eff8] text-[#003d7c] text-xs font-semibold px-2 py-0.5 rounded border border-[#c2c6d3]">
                        {user.profile}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {user.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#006e25]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#006e25]"></span> Active
                        </span>
                      ) : user.status === 'expired' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#ba1a1a]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a]"></span> Expired
                        </span>
                      ) : user.status === 'disabled' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#727783]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#727783]"></span> Disabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8f3c00]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#8f3c00]"></span> Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-[#424751]">{user.uptime}</td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-[#003d7c]">
                      {user.downloadFormatted}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-[#006e25]">
                      {user.uploadFormatted}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-[#727783]">
                      <div>{user.ipAddress || '—'}</div>
                      <div className="text-[10px]">{user.macAddress || ''}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {canMutate && (
                        <button
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          className="text-[#727783] hover:text-[#ba1a1a] p-1.5 hover:bg-[#ffdad6] rounded transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-[#c2c6d3] max-w-md w-full p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-[#141d23]">
              Add User Manager User
            </h2>
            <p className="text-xs text-[#424751]">
              Provisioning user on router: <span className="font-semibold text-[#003d7c]">{activeRouter?.name}</span>
            </p>

            <form onSubmit={handleAddUser} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#424751] block mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="e.g. user001 or guest_42"
                  className="w-full px-3 py-2 border border-[#c2c6d3] rounded-lg text-sm focus:outline-none focus:border-[#003d7c]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#424751] block mb-1">
                  Password
                </label>
                <input
                  type="text"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Enter initial password"
                  className="w-full px-3 py-2 border border-[#c2c6d3] rounded-lg text-sm focus:outline-none focus:border-[#003d7c]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#424751] block mb-1">
                  Profile Package
                </label>
                <select
                  value={newUser.profile}
                  onChange={(e) => setNewUser({ ...newUser, profile: e.target.value })}
                  className="w-full px-3 py-2 border border-[#c2c6d3] rounded-lg text-sm focus:outline-none focus:border-[#003d7c]"
                >
                  <option value="VIP-50Mbps">VIP-50Mbps (Unlimited)</option>
                  <option value="Standard-20Mbps">Standard-20Mbps</option>
                  <option value="Guest-1Hour">Guest-1Hour (1 GB Limit)</option>
                  <option value="Staff-Unlimited">Staff-Unlimited</option>
                  <option value="Day-Pass-5GB">Day-Pass-5GB</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#424751] block mb-1">
                  Comment / Note
                </label>
                <input
                  type="text"
                  value={newUser.comment}
                  onChange={(e) => setNewUser({ ...newUser, comment: e.target.value })}
                  placeholder="e.g. Front desk client or department"
                  className="w-full px-3 py-2 border border-[#c2c6d3] rounded-lg text-sm focus:outline-none focus:border-[#003d7c]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#dbe4ed]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-[#c2c6d3] rounded-lg text-sm text-[#424751] hover:bg-[#e6eff8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#003d7c] hover:bg-[#0054a6] text-white rounded-lg text-sm font-semibold"
                >
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
