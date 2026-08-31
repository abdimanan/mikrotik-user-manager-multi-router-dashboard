import React, { useState, useEffect } from 'react';
import { RouterRecord, UserManagerSession } from '../types';
import { Search, RefreshCw, UserMinus, Wifi, Activity, ArrowDown, ArrowUp } from 'lucide-react';
import { api } from '../api';

interface SessionsViewProps {
  routers: RouterRecord[];
  selectedRouterId?: string;
  onSelectRouter: (routerId: string) => void;
}

export const SessionsView: React.FC<SessionsViewProps> = ({
  routers,
  selectedRouterId
}) => {
  const [activeRouterId, setActiveRouterId] = useState<string>(
    selectedRouterId || (routers[0]?.id || '')
  );
  const [sessions, setSessions] = useState<UserManagerSession[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchSessions = async () => {
    if (!activeRouterId) return;
    setLoading(true);
    try {
      const res = await api.getRouterSessions(activeRouterId);
      setSessions(res.sessions);
    } catch (e) {
      console.error('Error fetching sessions:', e);
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
      fetchSessions();
    }
  }, [activeRouterId]);

  const handleKillSession = async (sessionId: string, username: string) => {
    if (window.confirm(`Terminate active session for ${username}?`)) {
      try {
        await api.killSession(activeRouterId, sessionId);
        fetchSessions();
      } catch (err) {
        console.error('Failed to terminate session', err);
      }
    }
  };

  const filtered = sessions.filter(
    (s) =>
      s.username.toLowerCase().includes(search.toLowerCase()) ||
      s.ipAddress.includes(search) ||
      s.macAddress.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col space-y-4 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#c2c6d3] pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#141d23] tracking-tight flex items-center gap-2">
            <Wifi className="w-7 h-7 text-[#003d7c]" />
            <span>Active Sessions</span>
          </h1>
          <p className="text-xs md:text-sm text-[#424751] mt-0.5">
            Real-time live connections, IP leases, and active bandwidth streams
          </p>
        </div>

        {/* Router Selector */}
        <div className="flex items-center gap-3">
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

          <button
            onClick={fetchSessions}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#e6eff8] border border-[#c2c6d3] text-[#003d7c] rounded-lg text-xs font-semibold shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#727783]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by active username, assigned IP, or MAC..."
          className="w-full pl-9 pr-4 py-2 bg-white border border-[#c2c6d3] rounded-lg text-sm focus:outline-none focus:border-[#003d7c]"
        />
      </div>

      {/* Sessions Table */}
      <div className="bg-white border border-[#c2c6d3] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#e6eff8] border-b border-[#c2c6d3] text-[11px] font-bold text-[#727783] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">MAC Address</th>
                <th className="py-3 px-4">Connected Duration</th>
                <th className="py-3 px-4">Rate Limit</th>
                <th className="py-3 px-4">Traffic (Down / Up)</th>
                <th className="py-3 px-4 text-right">Disconnect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dbe4ed]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-[#727783]">
                    Polling RouterOS `/user-manager/session/print`...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-[#727783]">
                    No active sessions connected currently.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-[#ecf5fe] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#141d23]">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#006e25] pulse-dot shrink-0"></span>
                        <span>{s.username}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-[#003d7c] font-medium">
                      {s.ipAddress}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-[#727783]">
                      {s.macAddress}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-[#424751]">
                      {s.uptime}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-[#424751]">
                      <span className="bg-[#f6faff] px-2 py-0.5 rounded border border-[#dbe4ed]">
                        {s.rateLimit || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="text-[#003d7c] flex items-center gap-0.5">
                          <ArrowDown className="w-3 h-3" /> {s.downloadFormatted}
                        </span>
                        <span className="text-[#006e25] flex items-center gap-0.5">
                          <ArrowUp className="w-3 h-3" /> {s.uploadFormatted}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleKillSession(s.id, s.username)}
                        className="px-2.5 py-1 text-xs font-semibold text-[#ba1a1a] bg-[#ffdad6] hover:bg-[#ba1a1a] hover:text-white rounded transition-colors inline-flex items-center gap-1"
                        title="Kill Session"
                      >
                        <UserMinus className="w-3 h-3" />
                        <span>Kick</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
