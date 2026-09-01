import React, { useEffect, useState } from 'react';
import { AuditLogEntry } from '../../types';
import { ScrollText, Filter } from 'lucide-react';
import { api } from '../../api';

const KNOWN_ACTIONS = [
  'router.create',
  'router.update',
  'router.delete',
  'router.seed_bulk',
  'user.create',
  'user.delete',
  'session.kill',
  'voucher.generate',
  'account.create',
  'account.update',
  'auth.login',
  'auth.logout'
];

const ACTION_COLOR: Record<string, string> = {
  create: 'text-[#006e25]',
  delete: 'text-[#ba1a1a]',
  update: 'text-[#003d7c]',
  login: 'text-[#006e25]',
  logout: 'text-[#727783]'
};

function colorForAction(action: string): string {
  const verb = action.split('.')[1] || '';
  return ACTION_COLOR[verb] || 'text-[#141d23]';
}

export const LogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs({
        page,
        limit: 50,
        action: actionFilter || undefined,
        from: from ? `${from}T00:00:00.000Z` : undefined,
        to: to ? `${to}T23:59:59.999Z` : undefined
      });
      setLogs(res.logs);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, actionFilter, from, to]);

  return (
    <div className="flex-1 flex flex-col space-y-5 max-w-[1200px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#c2c6d3] pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#141d23] tracking-tight flex items-center gap-2">
            <ScrollText className="w-7 h-7 text-[#003d7c]" />
            <span>Activity Logs</span>
          </h1>
          <p className="text-xs md:text-sm text-[#424751] mt-0.5">
            Every account action, across every user — {total.toLocaleString()} recorded
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-[#c2c6d3] rounded-lg shadow-xs">
          <Filter className="w-4 h-4 text-[#727783]" />
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs md:text-sm text-[#141d23] bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="">All actions</option>
            {KNOWN_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-[#c2c6d3] rounded-lg shadow-xs">
          <span className="text-xs text-[#727783]">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="text-xs md:text-sm text-[#141d23] bg-transparent focus:outline-none cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-[#c2c6d3] rounded-lg shadow-xs">
          <span className="text-xs text-[#727783]">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="text-xs md:text-sm text-[#141d23] bg-transparent focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      <div className="bg-white border border-[#c2c6d3] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#e6eff8] border-b border-[#c2c6d3] text-[11px] font-bold text-[#727783] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dbe4ed]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-[#727783]">
                    Loading logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-[#727783]">
                    No activity recorded for this filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#ecf5fe] transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-[#727783] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#141d23]">{log.username}</span>
                      <span className="ml-1.5 text-[10px] font-bold text-[#727783] uppercase">{log.role}</span>
                    </td>
                    <td className={`py-3 px-4 font-mono text-xs font-bold ${colorForAction(log.action)}`}>
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#424751]">
                      {log.targetType}
                      {log.targetId ? ` (${log.targetId})` : ''}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#424751] max-w-md truncate" title={log.detail}>
                      {log.detail || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-[#727783]">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="w-8 h-8 flex items-center justify-center rounded text-[#727783] hover:bg-[#dbe4ed] transition-colors disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="w-8 h-8 flex items-center justify-center rounded text-[#727783] hover:bg-[#dbe4ed] transition-colors disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
