import React, { useState, useEffect } from 'react';
import { RouterRecord, GlobalReportItem } from '../types';
import { FileText, Download, Calendar, ArrowDown, ArrowUp, BarChart3, Filter, HardDrive, Users } from 'lucide-react';
import { api } from '../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawTotalSummaryFooter, getTableFinalY } from '../utils/pdfReport';
import { formatMiB } from '../utils/bytes';

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
        activeRouterId === 'all' ? undefined : activeRouterId,
        selectedDate
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
    const headers = ['Username', 'Group', 'Active', 'Date', 'Uptime', 'Download', 'Upload', 'Total Bandwidth'];
    const rows = reports.map((r) => [
      `"${r.username}"`,
      `"${r.group || 'default'}"`,
      `"${r.active}"`,
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

  // KPIs - decimal (1000-based) GB, matching how ISPs (e.g. Starlink) report usage
  const totalDownloadBytes = reports.reduce((acc, r) => acc + (r.downloadBytes || 0), 0);
  const totalUploadBytes = reports.reduce((acc, r) => acc + (r.uploadBytes || 0), 0);
  const totalBandwidthGb = ((totalDownloadBytes + totalUploadBytes) / 1_000_000_000).toFixed(2);
  const activeUsersCount = reports.filter((r) => r.active === 1).length;
  const totalUsersCount = reports.length;

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const routerLabel = activeRouterId === 'all' ? 'All Routers (Combined)' : (routers.find(r => r.id === activeRouterId)?.name || activeRouterId);

    // Brand header band, matching the app's blue
    doc.setFillColor(0, 61, 124);
    doc.rect(0, 0, pageWidth, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('MikroTik Usage & Daily Report', 14, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Date: ${selectedDate}   |   Router: ${routerLabel}`, 14, 20);

    // KPI cards, mirroring the on-screen summary cards
    const cardY = 33;
    const cardHeight = 20;
    const gap = 6;
    const cardWidth = (pageWidth - 14 * 2 - gap * 3) / 4;
    const cards: { label: string; value: string; color: [number, number, number] }[] = [
      { label: 'TOTAL BANDWIDTH', value: `${totalBandwidthGb} GB`, color: [20, 29, 35] },
      { label: 'TOTAL DOWNLOAD', value: `${(totalDownloadBytes / 1_000_000_000).toFixed(2)} GB`, color: [0, 61, 124] },
      { label: 'TOTAL UPLOAD', value: `${(totalUploadBytes / 1_000_000_000).toFixed(2)} GB`, color: [0, 110, 37] },
      { label: 'ACTIVE USERS', value: `${activeUsersCount}/${totalUsersCount}`, color: [0, 110, 37] }
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

    const tableStartY = cardY + cardHeight + 8;
    autoTable(doc, {
      startY: tableStartY,
      head: [['Username', 'Group', 'Active', 'Date', 'Uptime', 'Download', 'Upload', 'Total Bandwidth']],
      body: reports.map((r) => [
        r.username,
        r.group || 'default',
        `${r.active}`,
        r.date,
        r.uptime,
        r.downloadFormatted,
        r.uploadFormatted,
        r.totalBandwidthFormatted
      ]),
      styles: { fontSize: 8, cellPadding: 3, valign: 'middle' },
      headStyles: { fillColor: [0, 61, 124], textColor: 255 },
      alternateRowStyles: { fillColor: [246, 250, 255] },
      columnStyles: {
        2: { halign: 'center' },
        5: { textColor: [0, 61, 124], fontStyle: 'bold' },
        6: { textColor: [0, 110, 37], fontStyle: 'bold' }
      }
    });

    drawTotalSummaryFooter(doc, getTableFinalY(doc, tableStartY), {
      downloadBytes: totalDownloadBytes,
      uploadBytes: totalUploadBytes,
      count: reports.filter((r) => r.active === 1).length,
      countLabel: 'Active'
    });

    doc.save(`mikrotik-usage-report-${selectedDate}.pdf`);
  };

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

          {/* Export PDF Button */}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#c2c6d3] rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-[#727783] uppercase tracking-wider block mb-1">
            Total Bandwidth
          </span>
          <span className="text-2xl font-bold text-[#141d23] font-mono block">
            {totalBandwidthGb} GB
          </span>
          <span className="text-xs font-mono text-[#0054a6] block mt-0.5">
            {formatMiB(totalDownloadBytes + totalUploadBytes)}
          </span>
        </div>

        <div className="bg-white border border-[#c2c6d3] rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-[#727783] uppercase tracking-wider block mb-1">
            Total Download
          </span>
          <span className="text-2xl font-bold text-[#003d7c] font-mono flex items-center gap-1">
            <ArrowDown className="w-5 h-5" />
            {(totalDownloadBytes / 1_000_000_000).toFixed(2)} GB
          </span>
          <span className="text-xs font-mono text-[#0054a6] block mt-0.5">
            {formatMiB(totalDownloadBytes)}
          </span>
        </div>

        <div className="bg-white border border-[#c2c6d3] rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-[#727783] uppercase tracking-wider block mb-1">
            Total Upload
          </span>
          <span className="text-2xl font-bold text-[#006e25] font-mono flex items-center gap-1">
            <ArrowUp className="w-5 h-5" />
            {(totalUploadBytes / 1_000_000_000).toFixed(2)} GB
          </span>
          <span className="text-xs font-mono text-[#0054a6] block mt-0.5">
            {formatMiB(totalUploadBytes)}
          </span>
        </div>

        <div className="bg-white border border-[#c2c6d3] rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-[#727783] uppercase tracking-wider block mb-1">
            Active Users
          </span>
          <span className="text-2xl font-bold text-[#006e25] font-mono flex items-center gap-1">
            <Users className="w-5 h-5" />
            {activeUsersCount}/{totalUsersCount}
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
                <th className="py-3 px-4">Group</th>
                <th className="py-3 px-4">Active</th>
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
                  <td colSpan={8} className="py-8 text-center text-sm text-[#727783]">
                    Compiling daily usage logs...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-[#727783]">
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
                      <span className="inline-block bg-[#e6eff8] text-[#003d7c] text-xs font-semibold px-2 py-0.5 rounded border border-[#c2c6d3]">
                        {item.group || 'default'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-bold">
                      <span className={item.active === 1 ? 'text-[#006e25]' : 'text-[#727783]'}>
                        {item.active}
                      </span>
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
