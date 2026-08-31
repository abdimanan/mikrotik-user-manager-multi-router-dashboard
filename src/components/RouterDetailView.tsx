import React, { useState, useEffect } from 'react';
import { RouterRecord, UserManagerUser, UserManagerSession, VoucherBatch } from '../types';
import { ArrowLeft, Terminal, RefreshCw, Users, Wifi, Ticket, BarChart3, ChevronRight, CheckCircle2, AlertCircle, Clock, Cpu, HardDrive } from 'lucide-react';
import { api } from '../api';

interface RouterDetailViewProps {
  router: RouterRecord;
  onBack: () => void;
  onNavigateToModule: (module: 'users' | 'sessions' | 'vouchers' | 'reports', routerId: string) => void;
  onOpenTerminal: (router: RouterRecord) => void;
}

function formatThroughput(mbps: number): string {
  if (mbps >= 1) return `${mbps.toFixed(1)} Mbps`;
  return `${(mbps * 1000).toFixed(1)} Kbps`;
}

// Builds a filled sparkline path from real sampled throughput readings -
// flat/empty when there's genuinely no traffic, rather than a decorative
// fake waveform.
function buildSparklinePath(values: number[]): string {
  if (values.length < 2) return 'M0,30 L100,30 Z';
  const max = Math.max(...values, 0.0001);
  const stepX = 100 / (values.length - 1);
  const points = values.map((v, i) => `${(i * stepX).toFixed(1)},${(30 - (v / max) * 28).toFixed(1)}`);
  return `M0,30 L${points.join(' L')} L100,30 Z`;
}

export const RouterDetailView: React.FC<RouterDetailViewProps> = ({
  router,
  onBack,
  onNavigateToModule,
  onOpenTerminal
}) => {
  const [syncing, setSyncing] = useState(false);
  const [liveRouter, setLiveRouter] = useState(router);
  const [userStats, setUserStats] = useState<{
    totalUsers: number;
    activeCount: number;
    expiredCount: number;
    voucherCount: number;
  } | null>(null);
  const [liveTraffic, setLiveTraffic] = useState<{ downloadMbps: number; uploadMbps: number } | null>(null);
  const [downloadHistory, setDownloadHistory] = useState<number[]>([]);
  const [uploadHistory, setUploadHistory] = useState<number[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);

  const isOnline = liveRouter.status === 'online';

  const fetchRouterDetails = async () => {
    try {
      const uRes = await api.getRouterUsers(router.id);
      const vRes = await api.getRouterVouchers(router.id);
      const totalVouchers = vRes.reduce((acc, b) => acc + b.vouchers.length, 0);

      setUserStats({
        totalUsers: uRes.totalCount,
        activeCount: uRes.activeCount,
        expiredCount: uRes.expiredCount,
        voucherCount: totalVouchers
      });
    } catch (e) {
      console.warn('Failed to fetch router user/voucher counts', e);
    }
  };

  const fetchLiveStats = async () => {
    try {
      const res = await api.syncRouter(router.id);
      setLiveRouter(res.router);
      setLiveTraffic(res.liveStats || null);
      setSyncError(res.error || null);
      if (res.liveStats) {
        setDownloadHistory((prev) => [...prev.slice(-19), res.liveStats!.downloadMbps]);
        setUploadHistory((prev) => [...prev.slice(-19), res.liveStats!.uploadMbps]);
      }
    } catch (e) {
      console.warn('Failed to sync live router telemetry', e);
    }
  };

  useEffect(() => {
    setLiveRouter(router);
    setDownloadHistory([]);
    setUploadHistory([]);
    fetchRouterDetails();
    fetchLiveStats();

    // Real telemetry poll (CPU/memory/throughput), not simulated
    const interval = setInterval(fetchLiveStats, 10000);
    return () => clearInterval(interval);
  }, [router.id]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetchLiveStats();
      await fetchRouterDetails();
    } catch (e) {
      console.error('Sync error:', e);
    } finally {
      setTimeout(() => setSyncing(false), 800);
    }
  };

  const hasCpuData = typeof liveRouter.cpuLoad === 'number';
  const hasMemData = typeof liveRouter.memoryUsedMb === 'number' && typeof liveRouter.memoryTotalMb === 'number';
  const cpuPercentage = liveRouter.cpuLoad ?? 0;
  const memoryUsed = liveRouter.memoryUsedMb ?? 0;
  const memoryTotal = liveRouter.memoryTotalMb || 1;
  const memoryPercentage = hasMemData ? Math.round((memoryUsed / memoryTotal) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col space-y-6 max-w-[1440px] mx-auto">
      {/* Back Button */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#003d7c] hover:text-[#0054a6] text-sm font-semibold transition-colors group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Routers</span>
        </button>
      </div>

      {/* Detail Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#c2c6d3] pb-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-[#141d23] tracking-tight">
              {liveRouter.name}
            </h1>
            {isOnline ? (
              <div className="flex items-center gap-1.5 bg-[#80f98b] text-[#007327] px-3 py-0.5 rounded-full border border-[#006e25]/20 font-bold text-xs">
                <span className="w-2 h-2 rounded-full bg-[#006e25] pulse-dot"></span>
                <span className="uppercase tracking-wider">Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-[#ffdad6] text-[#ba1a1a] px-3 py-0.5 rounded-full border border-[#ba1a1a]/20 font-bold text-xs">
                <span className="w-2 h-2 rounded-full bg-[#ba1a1a] pulse-danger"></span>
                <span className="uppercase tracking-wider">Offline</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-[#424751]">
            <span className="material-symbols-outlined text-[16px] text-[#727783]">lan</span>
            <span className="font-mono text-sm font-medium">{liveRouter.publicIp}</span>
            <span className="text-[#c2c6d3]">•</span>
            <span className="font-mono text-xs">
              {liveRouter.connectionType === 'api-ssl' ? 'API-SSL: 8729' : 'API: 8728'}
            </span>
            {liveRouter.location && (
              <>
                <span className="text-[#c2c6d3]">•</span>
                <span>{liveRouter.location}</span>
              </>
            )}
            {syncError && (
              <>
                <span className="text-[#c2c6d3]">•</span>
                <span className="text-[#ba1a1a] font-medium" title={syncError}>
                  {syncError}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={() => onOpenTerminal(router)}
            className="h-9 px-4 bg-white hover:bg-[#e6eff8] text-[#003d7c] border border-[#c2c6d3] rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-xs"
          >
            <Terminal className="w-4 h-4" />
            <span>Terminal</span>
          </button>

          <button
            onClick={handleSync}
            disabled={syncing}
            className="h-9 px-4 bg-[#003d7c] hover:bg-[#0054a6] text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-xs disabled:opacity-70"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Data'}</span>
          </button>
        </div>
      </div>

      {/* Primary Stats Grid (Bento Style) matching Image 5 */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* RouterOS Version */}
        <div className="bg-white border border-[#c2c6d3] rounded-xl p-4 flex flex-col gap-2 hover:bg-[#f6faff] transition-colors shadow-xs">
          <div className="flex items-center gap-2 text-[#727783]">
            <Cpu className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">RouterOS</span>
          </div>
          <div className="text-xl font-bold text-[#141d23] mt-1">
            {liveRouter.routerOsVersion || '—'}
          </div>
          <div className="text-xs text-[#727783]">
            Architecture: {liveRouter.architecture || '—'}
          </div>
        </div>

        {/* Uptime */}
        <div className="bg-white border border-[#c2c6d3] rounded-xl p-4 flex flex-col gap-2 hover:bg-[#f6faff] transition-colors shadow-xs">
          <div className="flex items-center gap-2 text-[#727783]">
            <Clock className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Uptime</span>
          </div>
          <div className="text-xl font-bold text-[#141d23] font-mono mt-1">
            {liveRouter.uptime || '—'}
          </div>
          <div className="text-xs text-[#727783]">Since last reboot</div>
        </div>

        {/* CPU Usage */}
        <div className="bg-white border border-[#c2c6d3] rounded-xl p-4 flex flex-col gap-2 hover:bg-[#f6faff] transition-colors shadow-xs">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-[#727783]">
              <span className="material-symbols-outlined text-[18px]">speed</span>
              <span className="text-[11px] font-bold uppercase tracking-wider">CPU Load</span>
            </div>
            <span className="text-xl font-bold text-[#003d7c] font-mono">
              {hasCpuData ? `${cpuPercentage}%` : '—'}
            </span>
          </div>
          <div className="w-full h-2 bg-[#dbe4ed] rounded-full mt-auto mb-1 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                cpuPercentage > 85
                  ? 'bg-[#ba1a1a]'
                  : cpuPercentage > 60
                  ? 'bg-[#ffb691]'
                  : 'bg-[#0054a6]'
              }`}
              style={{ width: `${hasCpuData ? Math.min(100, cpuPercentage) : 0}%` }}
            ></div>
          </div>
        </div>

        {/* Memory Usage */}
        <div className="bg-white border border-[#c2c6d3] rounded-xl p-4 flex flex-col gap-2 hover:bg-[#f6faff] transition-colors shadow-xs">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-[#727783]">
              <HardDrive className="w-4 h-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Memory</span>
            </div>
            <span className="text-xl font-bold text-[#141d23] font-mono">
              {hasMemData ? `${memoryUsed} MB` : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#727783] mt-auto mb-1">
            <span>{hasMemData ? `Used of ${memoryTotal} MB` : 'Not yet synced'}</span>
            <span className="font-mono">{hasMemData ? `${memoryPercentage}%` : ''}</span>
          </div>
          <div className="w-full h-2 bg-[#dbe4ed] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#185eb0] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, memoryPercentage)}%` }}
            ></div>
          </div>
        </div>
      </section>

      {/* Complex Content Area: Grid Layout matching Image 5 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Manager Summary Card (Spans 2 columns on desktop) */}
        <section className="lg:col-span-2 bg-[#ecf5fe] border border-[#c2c6d3] rounded-xl p-5 flex flex-col gap-5 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#141d23] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#003d7c]" />
              <span>User Manager Summary</span>
            </h2>
            <button
              onClick={() => onNavigateToModule('users', router.id)}
              className="text-[#003d7c] text-xs font-bold hover:underline cursor-pointer"
            >
              View All Users
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* Total Users */}
            <div className="flex flex-col gap-1 p-4 bg-white rounded-lg border border-[#c2c6d3]/60 shadow-xs">
              <span className="text-[11px] font-bold text-[#727783] uppercase tracking-wider">
                Total Users
              </span>
              <span className="text-2xl font-bold text-[#141d23] font-mono">
                {userStats ? userStats.totalUsers.toLocaleString() : '—'}
              </span>
            </div>

            {/* Active Now */}
            <div className="flex flex-col gap-1 p-4 bg-white rounded-lg border border-[#c2c6d3]/60 border-l-4 border-l-[#006e25] shadow-xs">
              <span className="text-[11px] font-bold text-[#727783] uppercase tracking-wider">
                Active Now
              </span>
              <span className="text-2xl font-bold text-[#006e25] font-mono">
                {userStats ? userStats.activeCount : '—'}
              </span>
            </div>

            {/* Expired */}
            <div className="flex flex-col gap-1 p-4 bg-white rounded-lg border border-[#c2c6d3]/60 border-l-4 border-l-[#ba1a1a] shadow-xs">
              <span className="text-[11px] font-bold text-[#727783] uppercase tracking-wider">
                Expired
              </span>
              <span className="text-2xl font-bold text-[#ba1a1a] font-mono">
                {userStats ? userStats.expiredCount : '—'}
              </span>
            </div>

            {/* Vouchers */}
            <div className="flex flex-col gap-1 p-4 bg-white rounded-lg border border-[#c2c6d3]/60 border-l-4 border-l-[#0054a6] shadow-xs">
              <span className="text-[11px] font-bold text-[#727783] uppercase tracking-wider">
                Vouchers
              </span>
              <span className="text-2xl font-bold text-[#0054a6] font-mono">
                {userStats ? userStats.voucherCount : '—'}
              </span>
            </div>
          </div>
        </section>

        {/* Traffic Section with SVG Sparklines matching Image 5 */}
        <section className="lg:col-span-1 bg-[#ecf5fe] border border-[#c2c6d3] rounded-xl p-5 flex flex-col gap-5 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#141d23] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#003d7c] text-[20px]">
                swap_vert
              </span>
              <span>Current Traffic</span>
            </h2>
          </div>

          <div className="flex flex-col gap-4">
            {/* Download Waveform */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-end">
                <span className="text-xs text-[#424751] font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-[#003d7c]">
                    arrow_downward
                  </span>
                  <span>Download</span>
                </span>
                <span className="text-sm font-bold font-mono text-[#003d7c]">
                  {liveTraffic ? formatThroughput(liveTraffic.downloadMbps) : '—'}
                </span>
              </div>
              <div className="w-full h-12 bg-[#dbe4ed] rounded-md flex items-end overflow-hidden pt-1 px-1">
                <svg
                  className="w-full h-full stroke-[#0054a6] fill-[#0054a6]/20"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 30"
                >
                  <path
                    d={buildSparklinePath(downloadHistory)}
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>
            </div>

            {/* Upload Waveform */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-end">
                <span className="text-xs text-[#424751] font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-[#006e25]">
                    arrow_upward
                  </span>
                  <span>Upload</span>
                </span>
                <span className="text-sm font-bold font-mono text-[#006e25]">
                  {liveTraffic ? formatThroughput(liveTraffic.uploadMbps) : '—'}
                </span>
              </div>
              <div className="w-full h-12 bg-[#dbe4ed] rounded-md flex items-end overflow-hidden pt-1 px-1">
                <svg
                  className="w-full h-full stroke-[#006e25] fill-[#006e25]/20"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 30"
                >
                  <path
                    d={buildSparklinePath(uploadHistory)}
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Router Management Modules matching Image 5 */}
      <section className="flex flex-col gap-3 pt-2">
        <h2 className="text-base font-bold text-[#141d23] border-b border-[#c2c6d3] pb-2">
          Router Management Modules
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Users Module */}
          <div
            onClick={() => onNavigateToModule('users', router.id)}
            className="group bg-white border border-[#c2c6d3] rounded-xl p-4 flex items-center justify-between hover:bg-[#003d7c] hover:border-[#003d7c] transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="bg-[#e6eff8] p-2.5 rounded-lg group-hover:bg-[#0054a6] transition-colors">
                <span className="material-symbols-outlined text-[#003d7c] group-hover:text-white text-[22px]">
                  group
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-[#141d23] group-hover:text-white">
                  Users
                </span>
                <span className="text-xs text-[#727783] group-hover:text-[#afcbff]">
                  Manage profiles
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#727783] group-hover:text-white" />
          </div>

          {/* Sessions Module */}
          <div
            onClick={() => onNavigateToModule('sessions', router.id)}
            className="group bg-white border border-[#c2c6d3] rounded-xl p-4 flex items-center justify-between hover:bg-[#003d7c] hover:border-[#003d7c] transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="bg-[#e6eff8] p-2.5 rounded-lg group-hover:bg-[#0054a6] transition-colors">
                <span className="material-symbols-outlined text-[#003d7c] group-hover:text-white text-[22px]">
                  wifi_tethering
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-[#141d23] group-hover:text-white">
                  Sessions
                </span>
                <span className="text-xs text-[#727783] group-hover:text-[#afcbff]">
                  Active connections
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#727783] group-hover:text-white" />
          </div>

          {/* Vouchers Module */}
          <div
            onClick={() => onNavigateToModule('vouchers', router.id)}
            className="group bg-white border border-[#c2c6d3] rounded-xl p-4 flex items-center justify-between hover:bg-[#003d7c] hover:border-[#003d7c] transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="bg-[#e6eff8] p-2.5 rounded-lg group-hover:bg-[#0054a6] transition-colors">
                <span className="material-symbols-outlined text-[#003d7c] group-hover:text-white text-[22px]">
                  confirmation_number
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-[#141d23] group-hover:text-white">
                  Vouchers
                </span>
                <span className="text-xs text-[#727783] group-hover:text-[#afcbff]">
                  Generate & print
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#727783] group-hover:text-white" />
          </div>

          {/* Reports Module */}
          <div
            onClick={() => onNavigateToModule('reports', router.id)}
            className="group bg-white border border-[#c2c6d3] rounded-xl p-4 flex items-center justify-between hover:bg-[#003d7c] hover:border-[#003d7c] transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="bg-[#e6eff8] p-2.5 rounded-lg group-hover:bg-[#0054a6] transition-colors">
                <span className="material-symbols-outlined text-[#003d7c] group-hover:text-white text-[22px]">
                  analytics
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-[#141d23] group-hover:text-white">
                  Reports
                </span>
                <span className="text-xs text-[#727783] group-hover:text-[#afcbff]">
                  Usage analytics
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#727783] group-hover:text-white" />
          </div>
        </div>
      </section>
    </div>
  );
};
