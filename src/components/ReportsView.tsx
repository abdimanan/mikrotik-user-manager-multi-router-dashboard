import React, { useState, useEffect } from 'react';
import { RouterRecord, GlobalReportItem } from '../types';
import { FileText, Download, Calendar, ArrowDown, ArrowUp, BarChart3, Filter, HardDrive } from 'lucide-react';
import { api } from '../api';

interface ReportsViewProps {
  routers: RouterRecord[];
  selectedRouterId?: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  routers,
  selectedRouterId
}) => {
  const [activeRouterId, setActiveRouterId] = useState<string>(selectedRouterId || 'all');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [reports, setReports] = useState<GlobalReportItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.getRouterReports(
        activeRouterId === 'all' ? undefined : activeRouterId
      );
      setReports(res);
    } catch (e) {
      console.error('Error fetching reports:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRouterId) setActiveRouterId(selectedRouterId);
  }, [selectedRouterId]);

  useEffect(() => {
    fetchReports();
  }, [activeRouterId, selectedDate]);

  const exportCSV = () => {
    const headers = ['Router Name', 'Public IP', 'Username', 'Date', 'Uptime', 'Download', 'Upload', 'Total Bandwidth'];
    const rows = reports.map((r) => [
      `"${r.routerName}"`,
      `"${r.publicIp}"`,
      `"${r.username}"`,
      `"${r.date}"`,
      `"${r.uptime}"`,
      `"${r.downloadFormatted}"`,
      `"${r.uploadFormatted}"`,
      `"${r.totalBandwidthFormatted}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mikrotik-usage-report-${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // KPIs
  const totalDownloadBytes = reports.reduce((acc, r) => acc + (r.downloadBytes || 0), 0);
  const totalUploadBytes = reports.reduce((acc, r) => acc + (r.uploadBytes || 0), 0);
  const totalBandwidthGb = ((totalDownloadBytes + totalUploadBytes) / (1024 * 1024 * 1024)).toFixed(2);

  return (
    <div className="flex-1 flex flex-col space-y-5 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#c2c6d3] pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#141d23] tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-[#003d7c]" />
            <span>Usage & Daily Reports</span>
          </h1>
          <p className="text-xs md:text-sm text-[#424751] mt-0.5">
            Historical accounting, bandwidth consumption, and user session metrics
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-[#c2c6d3] rounded-lg shadow-xs">
            <Calendar className="w-4 h-4 text-[#727783]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs md:text-sm text-[#141d23] bg-transparent focus:outline-none cursor-pointer"
            />
          </div>

          {/* Router Filter */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-[#c2c6d3] rounded-lg shadow-xs">
            <span className="text-xs text-[#727783]">Router:</span>
            <select
              value={activeRouterId}
              onChange={(e) => setActiveRouterId(e.target.value)}
              className="text-xs md:text-sm font-semibold text-[#003d7c] bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="all">All Routers (Combined)</option>
              {routers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#003d7c] hover:bg-[#0054a6] text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#c2c6d3] rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-[#727783] uppercase tracking-wider block mb-1">
            Total Bandwidth
          </span>
          <span className="text-2xl font-bold text-[#141d23] font-mono">
            {totalBandwidthGb} GB
          </span>
        </div>

        <div className="bg-white border border-[#c2c6d3] rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-[#727783] uppercase tracking-wider block mb-1">
            Total Download
          </span>
          <span className="text-2xl font-bold text-[#003d7c] font-mono flex items-center gap-1">
            <ArrowDown className="w-5 h-5" />
            {(totalDownloadBytes / (1024 * 1024 * 1024)).toFixed(2)} GB
          </span>
        </div>

        <div className="bg-white border border-[#c2c6d3] rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-[#727783] uppercase tracking-wider block mb-1">
            Total Upload
          </span>
          <span className="text-2xl font-bold text-[#006e25] font-mono flex items-center gap-1">
            <ArrowUp className="w-5 h-5" />
            {(totalUploadBytes / (1024 * 1024 * 1024)).toFixed(2)} GB
          </span>
        </div>
      </div>

      {/* Reports Table matching Prompt Spec */}
      <div className="bg-white border border-[#c2c6d3] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#e6eff8] border-b border-[#c2c6d3] text-[11px] font-bold text-[#727783] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Router / Public IP</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Uptime</th>
                <th className="py-3 px-4">Download</th>
                <th className="py-3 px-4">Upload</th>
                <th className="py-3 px-4">Total Bandwidth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dbe4ed]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-[#727783]">
                    Compiling daily usage logs...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-[#727783]">
                    No report records found for this timeframe.
                  </td>
                </tr>
              ) : (
                reports.map((item) => (
                  <tr key={item.id} className="hover:bg-[#ecf5fe] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#141d23]">
                      {item.username}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-[#141d23] text-xs">
                        {item.routerName}
                      </div>
                      <div className="font-mono text-[11px] text-[#727783]">
                        {item.publicIp}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-[#727783]">
                      {item.date}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-[#424751]">
                      {item.uptime}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-[#003d7c]">
                      {item.downloadFormatted}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-[#006e25]">
                      {item.uploadFormatted}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-bold text-[#141d23]">
                      {item.totalBandwidthFormatted}
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
