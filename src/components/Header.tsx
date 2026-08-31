import React, { useState } from 'react';
import { MainTab, RouterAlert } from '../types';
import { Download, ShieldCheck, HelpCircle } from 'lucide-react';
import { api } from '../api';

interface HeaderProps {
  currentTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  alerts: RouterAlert[];
  onOpenAlerts: () => void;
  onOpenFirewallGuide: () => void;
  onOpenAddRouter: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  alerts,
  onOpenAlerts,
  onOpenFirewallGuide,
  onOpenAddRouter
}) => {
  const [downloading, setDownloading] = useState(false);
  const unreadAlertsCount = alerts.filter(a => !a.read).length;

  const handleDownloadZip = () => {
    setDownloading(true);
    window.location.href = api.getDownloadZipUrl();
    setTimeout(() => setDownloading(false), 2000);
  };

  return (
    <header className="bg-[#f6faff] text-[#003d7c] border-b border-[#c2c6d3] sticky top-0 z-50 flex items-center justify-between px-4 md:px-6 h-14 w-full backdrop-blur-md bg-opacity-95 shadow-xs">
      <div className="flex items-center gap-4">
        {/* Logo Icon */}
        <button
          onClick={() => onTabChange('dashboard')}
          className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity focus:outline-none"
        >
          <span className="material-symbols-outlined text-[#003d7c] text-[26px]">
            router
          </span>
          <span className="text-[18px] font-bold text-[#003d7c] tracking-tight">
            MT Manager
          </span>
        </button>

        {/* Desktop Nav Cluster */}
        <nav className="hidden md:flex ml-8 items-center gap-2">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-2 text-sm font-medium ${
              currentTab === 'dashboard'
                ? 'bg-[#e6eff8] text-[#003d7c] font-semibold'
                : 'text-[#424751] hover:bg-[#dbe4ed] hover:text-[#003d7c]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => onTabChange('routers')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-2 text-sm font-medium ${
              currentTab === 'routers'
                ? 'bg-[#e6eff8] text-[#003d7c] font-semibold'
                : 'text-[#424751] hover:bg-[#dbe4ed] hover:text-[#003d7c]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">settings_input_antenna</span>
            <span>Routers</span>
          </button>

          <button
            onClick={() => onTabChange('users')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-2 text-sm font-medium ${
              currentTab === 'users'
                ? 'bg-[#e6eff8] text-[#003d7c] font-semibold'
                : 'text-[#424751] hover:bg-[#dbe4ed] hover:text-[#003d7c]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">group</span>
            <span>Users</span>
          </button>

          <button
            onClick={() => onTabChange('usage')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-2 text-sm font-medium ${
              currentTab === 'usage'
                ? 'bg-[#e6eff8] text-[#003d7c] font-semibold'
                : 'text-[#424751] hover:bg-[#dbe4ed] hover:text-[#003d7c]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">data_usage</span>
            <span>Usage</span>
          </button>

          <button
            onClick={() => onTabChange('sessions')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-2 text-sm font-medium ${
              currentTab === 'sessions'
                ? 'bg-[#e6eff8] text-[#003d7c] font-semibold'
                : 'text-[#424751] hover:bg-[#dbe4ed] hover:text-[#003d7c]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">wifi_tethering</span>
            <span>Sessions</span>
          </button>

          <button
            onClick={() => onTabChange('vouchers')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-2 text-sm font-medium ${
              currentTab === 'vouchers'
                ? 'bg-[#e6eff8] text-[#003d7c] font-semibold'
                : 'text-[#424751] hover:bg-[#dbe4ed] hover:text-[#003d7c]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">confirmation_number</span>
            <span>Vouchers</span>
          </button>

          <button
            onClick={() => onTabChange('reports')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-2 text-sm font-medium ${
              currentTab === 'reports'
                ? 'bg-[#e6eff8] text-[#003d7c] font-semibold'
                : 'text-[#424751] hover:bg-[#dbe4ed] hover:text-[#003d7c]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">analytics</span>
            <span>Reports</span>
          </button>
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {/* Firewall Guide Button */}
        <button
          onClick={onOpenFirewallGuide}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#003d7c] bg-[#e6eff8] hover:bg-[#dbe4ed] rounded border border-[#c2c6d3] transition-colors"
          title="MikroTik API-SSL 8729 & Firewall Setup Guide"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Firewall Guide</span>
        </button>

        {/* Download Project ZIP */}
        <button
          onClick={handleDownloadZip}
          disabled={downloading}
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white bg-[#0054a6] hover:bg-[#003d7c] rounded transition-colors"
          title="Download complete working source code ZIP"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{downloading ? 'Preparing ZIP...' : 'Export ZIP'}</span>
        </button>

        {/* Notifications Icon with Badge */}
        <button
          onClick={onOpenAlerts}
          className="hover:bg-[#dbe4ed] p-2 rounded-full transition-colors relative text-[#003d7c]"
          title="Recent Router Alerts"
        >
          <span className="material-symbols-outlined text-[22px]">notifications</span>
          {unreadAlertsCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#ba1a1a] rounded-full ring-2 ring-white"></span>
          )}
        </button>
      </div>
    </header>
  );
};
