import React from 'react';
import { GlobalStats, RouterAlert } from '../types';
import { Plus, FileText, Database, ArrowRight, ShieldCheck, Download } from 'lucide-react';
import { api } from '../api';

interface DashboardViewProps {
  stats: GlobalStats | null;
  alerts: RouterAlert[];
  onOpenAddRouter: () => void;
  onNavigateToRouters: (statusFilter?: string) => void;
  onNavigateToReports: () => void;
  onOpenAlerts: () => void;
  onOpenFirewallGuide: () => void;
  onSeedBulk: () => void;
  loading: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  alerts,
  onOpenAddRouter,
  onNavigateToRouters,
  onNavigateToReports,
  onOpenAlerts,
  onOpenFirewallGuide,
  onSeedBulk,
  loading
}) => {
  const displayStats = stats || {
    totalRouters: 0,
    totalRoutersRaw: 0,
    onlineRouters: 0,
    onlineRoutersRaw: 0,
    offlineRouters: 0,
    offlineRoutersRaw: 0,
    totalUsers: 0,
    totalUsersRaw: 0,
    activeUsers: 0,
    activeUsersRaw: 0,
    expiredUsers: 0,
    totalSessions: 0,
    recentAlerts: alerts
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-[#dbe4ed] pb-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#141d23] tracking-tight">
            Global Overview
          </h1>
          <p className="text-xs md:text-sm text-[#424751] mt-0.5">
            Central telemetry and User Manager management for multi-location MikroTik fleet
          </p>
        </div>
        <span className="text-xs text-[#727783] font-medium hidden sm:inline-block">
          Last updated: Just now
        </span>
      </div>

      {/* Top Section: Key Metrics (Bento Grid) */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Routers */}
        <div
          onClick={() => onNavigateToRouters('all')}
          className="bg-white border border-[#c2c6d3] p-4 rounded-lg flex flex-col justify-between h-32 hover:border-[#003d7c] transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#727783] uppercase tracking-wider">
              Total Routers
            </span>
            <span className="material-symbols-outlined text-[#727783] text-[20px] group-hover:text-[#003d7c] transition-colors">
              router
            </span>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-[#141d23] font-mono mt-auto">
            {displayStats.totalRouters}
          </div>
        </div>

        {/* Online */}
        <div
          onClick={() => onNavigateToRouters('online')}
          className="bg-white border border-[#c2c6d3] p-4 rounded-lg flex flex-col justify-between h-32 hover:border-[#006e25] transition-all cursor-pointer relative overflow-hidden shadow-xs group"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#006e25]/5 rounded-bl-full -mr-4 -mt-4 pointer-events-none"></div>
          <div className="flex items-center justify-between z-10">
            <span className="text-[11px] font-bold text-[#727783] uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#006e25]"></span> Online
            </span>
            <span className="material-symbols-outlined text-[#006e25] text-[20px]">
              check_circle
            </span>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-[#006e25] font-mono z-10 mt-auto">
            {displayStats.onlineRouters}
          </div>
        </div>

        {/* Offline */}
        <div
          onClick={() => onNavigateToRouters('offline')}
          className="bg-white border border-[#ffdad6] p-4 rounded-lg flex flex-col justify-between h-32 hover:border-[#ba1a1a] transition-all cursor-pointer relative overflow-hidden shadow-xs group bg-[#fffbfa]"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#ba1a1a]/5 rounded-bl-full -mr-4 -mt-4 pointer-events-none"></div>
          <div className="flex items-center justify-between z-10">
            <span className="text-[11px] font-bold text-[#ba1a1a] uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ba1a1a] pulse-danger"></span> Offline
            </span>
            <span className="material-symbols-outlined text-[#ba1a1a] text-[20px]">
              warning
            </span>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-[#ba1a1a] font-mono z-10 mt-auto">
            {displayStats.offlineRouters}
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white border border-[#c2c6d3] p-4 rounded-lg flex flex-col justify-between h-32 hover:border-[#003d7c] transition-all cursor-default shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#727783] uppercase tracking-wider">
              Active Users
            </span>
            <span className="material-symbols-outlined text-[#727783] text-[20px]">
              group
            </span>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-[#003d7c] font-mono mt-auto">
            {displayStats.activeUsers}
          </div>
        </div>
      </section>

      {/* Middle & Bottom Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Middle Section: Recent Alerts (Spans 2 cols on lg) */}
        <section className="lg:col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#141d23] flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#ba1a1a]">
                notifications_active
              </span>
              <span>Recent Alerts</span>
            </h2>
            <span className="text-xs text-[#727783]">
              {alerts.length} event{alerts.length !== 1 ? 's' : ''} logged
            </span>
          </div>

          <div className="bg-white border border-[#c2c6d3] rounded-lg overflow-hidden shadow-xs">
            <ul className="divide-y divide-[#dbe4ed]">
              {alerts.slice(0, 4).map((alert) => (
                <li
                  key={alert.id}
                  className="p-4 hover:bg-[#ecf5fe] transition-colors flex gap-3.5 items-start"
                >
                  <div className="mt-0.5 shrink-0">
                    {alert.severity === 'error' ? (
                      <span className="material-symbols-outlined text-[#ba1a1a] text-[20px]">
                        error
                      </span>
                    ) : alert.severity === 'warning' ? (
                      <span className="material-symbols-outlined text-[#8f3c00] text-[20px]">
                        warning
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-[#0054a6] text-[20px]">
                        info
                      </span>
                    )}
                  </div>

                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <h3 className="text-sm font-bold text-[#141d23] truncate">
                        {alert.title}
                      </h3>
                      <span className="text-xs text-[#727783] whitespace-nowrap ml-3 shrink-0">
                        {alert.timeAgo}
                      </span>
                    </div>
                    <p className="text-xs text-[#424751] leading-relaxed">
                      {alert.description}
                    </p>
                    {alert.publicIp && (
                      <div className="mt-1.5 flex gap-2">
                        <span className="text-[11px] font-mono text-[#727783] bg-[#f6faff] px-1.5 py-0.5 rounded border border-[#dbe4ed]">
                          IP: {alert.publicIp}
                        </span>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="bg-[#e6eff8] p-2.5 border-t border-[#c2c6d3] text-center">
              <button
                onClick={onOpenAlerts}
                className="text-xs font-bold text-[#003d7c] hover:text-[#0054a6] transition-colors uppercase tracking-wider w-full h-7 flex items-center justify-center gap-1"
              >
                <span>View All Alerts</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* Bottom Section: Quick Links / Actions */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-[#141d23] flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-[#0054a6]">
              bolt
            </span>
            <span>Quick Actions</span>
          </h2>

          <div className="bg-white border border-[#c2c6d3] p-5 rounded-lg flex flex-col gap-3.5 h-full shadow-xs justify-between">
            <div>
              <p className="text-sm text-[#424751] mb-4">
                Perform router onboarding, reporting, and fleet management rapidly.
              </p>

              <div className="space-y-2.5">
                <button
                  onClick={onOpenAddRouter}
                  className="w-full bg-[#003d7c] hover:bg-[#0054a6] text-white text-sm font-semibold h-10 px-4 rounded flex items-center justify-center gap-2 transition-colors shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Router</span>
                </button>

                <button
                  onClick={onNavigateToReports}
                  className="w-full bg-[#e6eff8] hover:bg-[#dbe4ed] border border-[#c2c6d3] text-[#003d7c] text-sm font-semibold h-10 px-4 rounded flex items-center justify-center gap-2 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span>Generate Global Report</span>
                </button>

                <button
                  onClick={onSeedBulk}
                  className="w-full bg-white hover:bg-[#f6faff] border border-dashed border-[#0054a6] text-[#0054a6] text-sm font-semibold h-10 px-4 rounded flex items-center justify-center gap-2 transition-colors"
                  title="Generate realistic simulated routers to test 1,000+ router scaling"
                >
                  <Database className="w-4 h-4" />
                  <span>Test 1,000+ Router Fleet</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-[#dbe4ed] space-y-2">
              <div className="flex items-center justify-between text-xs text-[#727783]">
                <span>Architecture</span>
                <span className="font-semibold text-[#141d23]">On-Demand Connection Pool</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#727783]">
                <span>Default Port</span>
                <span className="font-mono text-[#003d7c] font-semibold">API-SSL 8729 (TLS)</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#727783]">
                <span>Credential Security</span>
                <span className="text-[#006e25] font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> AES-256-GCM
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
