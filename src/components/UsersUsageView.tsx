import React, { useState, useEffect } from 'react';
import { RouterRecord, UserManagerUser } from '../types';
import { Search, HardDrive, RefreshCw, Download, FileText } from 'lucide-react';
import { api } from '../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawTotalSummaryFooter, getTableFinalY } from '../utils/pdfReport';
import { formatMiB } from '../utils/bytes';

interface UsersUsageViewProps {
  routers: RouterRecord[];
  selectedRouterId?: string;
  onSelectRouter: (routerId: string) => void;
}

const barColor = (pct: number): string => {
  if (pct >= 90) return 'bg-[#ba1a1a]';
  if (pct >= 70) return 'bg-[#8f3c00]';
  return 'bg-[#006e25]';
};

export const UsersUsageView: React.FC<UsersUsageViewProps> = ({
  routers,
  selectedRouterId,
  onSelectRouter
}) => {
  const [activeRouterId, setActiveRouterId] = useState<string>(
    selectedRouterId || (routers[0]?.id || '')
  );
  const [users, setUsers] = useState<UserManagerUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const activeRouter = routers.find((r) => r.id === activeRouterId) || routers[0];

  const fetchUsers = async () => {
    if (!activeRouterId) return;
    setLoading(true);
    try {
      const res = await api.getRouterUsers(activeRouterId);
      setUsers(res.users);
    } catch (e) {
      console.error('Error fetching usage:', e);
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

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.group || '').toLowerCase().includes(search.toLowerCase())
  );

  // Only users with a known quota can be meaningfully sorted by "most used first"
  const sorted = [...filtered].sort((a, b) => (b.percentUsed ?? -1) - (a.percentUsed ?? -1));

  // Fleet-wide totals (decimal GB, matching the Usage Reports page) - "used"
  // covers everyone, but "remaining"/"overall" quota only makes sense across
  // users who actually have a quota configured (skip unlimited accounts).
  const totalUsedBytes = users.reduce((acc, u) => acc + (u.periodUsedBytes || 0), 0);
  const totalRemainingBytes = users.reduce((acc, u) => acc + (u.dataRemainingBytes || 0), 0);
  const totalLimitBytes = users.reduce((acc, u) => acc + (u.dataLimitBytes || 0), 0);
  const toGb = (bytes: number) => (bytes / 1_000_000_000).toFixed(2);

  const resetsLabel = (u: UserManagerUser) =>
    u.quotaResetInterval ? `${u.quotaResetInterval} (${u.quotaResetsAt?.split(' ')[0] || '—'})` : '—';

  const exportCSV = () => {
    const headers = ['Username', 'Group', '% Used', 'Used', 'Remaining', 'Limit', 'Resets'];
    const rows = sorted.map((u) => [
      `"${u.username}"`,
      `"${u.group || 'default'}"`,
      `"${typeof u.percentUsed === 'number' ? Math.min(100, u.percentUsed).toFixed(0) + '%' : 'N/A'}"`,
      `"${u.periodUsedFormatted || '—'}"`,
      `"${u.dataRemainingFormatted || '—'}"`,
      `"${u.dataLimitFormatted || 'Unlimited'}"`,
      `"${resetsLabel(u)}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mikrotik-users-usage-${activeRouter?.name || activeRouterId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Brand header band, matching the app's blue
    doc.setFillColor(0, 61, 124);
    doc.rect(0, 0, pageWidth, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('MikroTik Users Usage Report', 14, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(
      `Router: ${activeRouter?.name || '—'} (${activeRouter?.publicIp || ''})   |   Generated: ${new Date().toISOString().split('T')[0]}`,
      14,
      20
    );

    // KPI cards, mirroring the on-screen summary cards
    const cardY = 33;
    const cardHeight = 20;
    const gap = 6;
    const cardWidth = (pageWidth - 14 * 2 - gap * 2) / 3;
    const cards: { label: string; value: string; color: [number, number, number] }[] = [
      { label: 'TOTAL DATA OVERALL', value: `${toGb(totalLimitBytes)} GB`, color: [20, 29, 35] },
      { label: 'TOTAL USAGE DATA', value: `${toGb(totalUsedBytes)} GB`, color: [0, 61, 124] },
      { label: 'TOTAL DATA REMAINING', value: `${toGb(totalRemainingBytes)} GB`, color: [0, 110, 37] }
    ];
    cards.forEach((card, i) => {
      const x = 14 + i * (cardWidth + gap);
      doc.setDrawColor(194, 198, 211);
      doc.setFillColor(246, 250, 255);
      doc.roundedRect(x, cardY, cardWidth, cardHeight, 2, 2, 'FD');
      doc.setTextColor(114, 119, 131);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(card.label, x + 4, cardY + 7);
      doc.setTextColor(card.color[0], card.color[1], card.color[2]);
      doc.setFontSize(13);
      doc.text(card.value, x + 4, cardY + 16);
    });

    // Table, with a real progress bar drawn per row like the on-screen "Data Usage" column
    const tableStartY = cardY + cardHeight + 8;
    autoTable(doc, {
      startY: tableStartY,
      head: [['Username', 'Group', 'Data Usage', 'Used', 'Remaining', 'Limit', 'Resets']],
      body: sorted.map((u) => {
        const pct = typeof u.percentUsed === 'number' ? Math.min(100, u.percentUsed) : null;
        return [
          u.username,
          u.group || 'default',
          pct !== null ? `${pct.toFixed(0)}%` : 'N/A',
          u.periodUsedFormatted || '—',
          u.dataRemainingFormatted || '—',
          u.dataLimitFormatted || 'Unlimited',
          resetsLabel(u)
        ];
      }),
      styles: { fontSize: 8, cellPadding: 3, valign: 'middle' },
      headStyles: { fillColor: [0, 61, 124], textColor: 255 },
      alternateRowStyles: { fillColor: [246, 250, 255] },
      columnStyles: {
        2: { halign: 'right', cellWidth: 34 },
        3: { textColor: [0, 61, 124], fontStyle: 'bold' },
        4: { textColor: [0, 110, 37], fontStyle: 'bold' }
      },
      didDrawCell: (data) => {
        if (data.section !== 'body' || data.column.index !== 2) return;
        const u = sorted[data.row.index];
        const pct = typeof u.percentUsed === 'number' ? Math.min(100, u.percentUsed) : null;
        const { x, y, width, height } = data.cell;
        const barHeight = 2.5;
        const barY = y + height / 2 - barHeight / 2;
        const barX = x + 2;
        const barWidth = width - 16; // leave room for the "NN%" text on the right

        doc.setFillColor(230, 239, 248);
        doc.roundedRect(barX, barY, barWidth, barHeight, 1, 1, 'F');

        if (pct !== null) {
          const fillWidth = Math.max(1.5, (barWidth * pct) / 100);
          const color: [number, number, number] = pct >= 90 ? [186, 26, 26] : pct >= 70 ? [143, 60, 0] : [0, 110, 37];
          doc.setFillColor(color[0], color[1], color[2]);
          doc.roundedRect(barX, barY, fillWidth, barHeight, 1, 1, 'F');
        }
      }
    });

    const totalDownloadBytes = users.reduce((acc, u) => acc + (u.downloadBytes || 0), 0);
    const totalUploadBytes = users.reduce((acc, u) => acc + (u.uploadBytes || 0), 0);
    const activeCount = users.filter((u) => u.status === 'active').length;
    drawTotalSummaryFooter(doc, getTableFinalY(doc, tableStartY), {
      downloadBytes: totalDownloadBytes,
      uploadBytes: totalUploadBytes,
      count: activeCount,
      countLabel: 'Active'
    });

    doc.save(`mikrotik-users-usage-${activeRouter?.name || activeRouterId}.pdf`);
  };

  return (
    <div className="flex-1 flex flex-col space-y-4 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#c2c6d3] pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#141d23] tracking-tight flex items-center gap-2">
            <HardDrive className="w-7 h-7 text-[#003d7c]" />
            <span>Users Usage</span>
          </h1>
          <p className="text-xs md:text-sm text-[#424751] mt-0.5">
            Data quota consumed and remaining per user, for the current billing period
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-[#c2c6d3] rounded-lg shadow-xs">
            <span className="text-xs text-[#727783] font-medium whitespace-nowrap">
              Target Router:
            </span>
            <select
              value={activeRouterId}
              onChange={(e) => {
                setActiveRouterId(e.target.value);
                onSelectRouter(e.target.value);
              }}
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
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#e6eff8] border border-[#c2c6d3] text-[#003d7c] rounded-lg text-xs font-semibold shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#003d7c] hover:bg-[#0054a6] text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={exportPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#e6eff8] border border-[#c2c6d3] text-[#003d7c] rounded-lg text-xs font-semibold transition-colors shadow-xs"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#c2c6d3] rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-[#727783] uppercase tracking-wider block mb-1">
            Total Data Overall
          </span>
          <span className="text-2xl font-bold text-[#141d23] font-mono block">
            {toGb(totalLimitBytes)} GB
          </span>
          <span className="text-xs font-mono text-[#0054a6] block mt-0.5">
            {formatMiB(totalLimitBytes)}
          </span>
        </div>

        <div className="bg-white border border-[#c2c6d3] rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-[#727783] uppercase tracking-wider block mb-1">
            Total Usage Data
          </span>
          <span className="text-2xl font-bold text-[#003d7c] font-mono block">
            {toGb(totalUsedBytes)} GB
          </span>
          <span className="text-xs font-mono text-[#0054a6] block mt-0.5">
            {formatMiB(totalUsedBytes)}
          </span>
        </div>

        <div className="bg-white border border-[#c2c6d3] rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-[#727783] uppercase tracking-wider block mb-1">
            Total Data Remaining
          </span>
          <span className="text-2xl font-bold text-[#006e25] font-mono block">
            {toGb(totalRemainingBytes)} GB
          </span>
          <span className="text-xs font-mono text-[#0054a6] block mt-0.5">
            {formatMiB(totalRemainingBytes)}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#727783]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search username or group..."
          className="w-full pl-9 pr-4 py-2 bg-white border border-[#c2c6d3] rounded-lg text-sm focus:outline-none focus:border-[#003d7c]"
        />
      </div>

      {/* Usage Table */}
      <div className="bg-white border border-[#c2c6d3] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#e6eff8] border-b border-[#c2c6d3] text-[11px] font-bold text-[#727783] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Group</th>
                <th className="py-3 px-4 min-w-[220px]">Data Usage</th>
                <th className="py-3 px-4">Used</th>
                <th className="py-3 px-4">Remaining</th>
                <th className="py-3 px-4">Limit</th>
                <th className="py-3 px-4">Resets</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dbe4ed]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-[#727783]">
                    Connecting to RouterOS API...
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-[#727783]">
                    No users found matching criteria.
                  </td>
                </tr>
              ) : (
                sorted.map((user) => {
                  const hasQuota = typeof user.percentUsed === 'number';
                  const pct = hasQuota ? Math.min(100, user.percentUsed as number) : 0;
                  return (
                    <tr key={user.id} className="hover:bg-[#ecf5fe] transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#141d23]">
                        {user.username}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block bg-[#e6eff8] text-[#003d7c] text-xs font-semibold px-2 py-0.5 rounded border border-[#c2c6d3]">
                          {user.group || 'default'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {hasQuota ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-[#e6eff8] overflow-hidden">
                              <div
                                className={`h-full rounded-full ${barColor(pct)}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] text-[#727783] w-10 text-right">
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#727783]">No quota configured</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-[#003d7c]">
                        {user.periodUsedFormatted || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-[#006e25]">
                        {user.dataRemainingFormatted || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-[#424751]">
                        {user.dataLimitFormatted || 'Unlimited'}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#727783]">
                        {user.quotaResetInterval ? `${user.quotaResetInterval} (${user.quotaResetsAt?.split(' ')[0] || '—'})` : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
