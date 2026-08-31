import React from 'react';
import { MainTab } from '../types';
import { Download, ShieldCheck, Database, Sliders } from 'lucide-react';
import { api } from '../api';

interface SidebarProps {
  currentTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  onOpenFirewallGuide: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  onOpenFirewallGuide
}) => {
  return (
    <aside className="hidden md:flex flex-col w-60 bg-[#f6faff] border-r border-[#c2c6d3] h-[calc(100vh-3.5rem)] sticky top-14 shrink-0 justify-between">
      <div className="py-4 px-3 flex flex-col gap-1">
        <div className="px-3 pb-2 mb-2 border-b border-[#dbe4ed]">
          <span className="text-[11px] font-bold text-[#727783] uppercase tracking-wider">
            Network Core
          </span>
        </div>

        <button
          onClick={() => onTabChange('dashboard')}
          className={`flex items-center px-3 py-2.5 rounded-lg text-sm transition-colors text-left w-full ${
            currentTab === 'dashboard'
              ? 'bg-[#80f98b] text-[#007327] font-semibold'
              : 'text-[#424751] hover:bg-[#dbe4ed] hover:text-[#003d7c]'
          }`}
        >
          <span className="material-symbols-outlined mr-3 text-[20px]">dashboard</span>
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => onTabChange('routers')}
          className={`flex items-center px-3 py-2.5 rounded-lg text-sm transition-colors text-left w-full ${
            currentTab === 'routers'
              ? 'bg-[#80f98b] text-[#007327] font-semibold'
              : 'text-[#424751] hover:bg-[#dbe4ed] hover:text-[#003d7c]'
          }`}
        >
          <span className="material-symbols-outlined mr-3 text-[20px]">settings_input_antenna</span>
          <span>Routers (1,000+)</span>
        </button>

        <div className="px-3 pt-4 pb-2 mb-1 mt-2 border-b border-[#dbe4ed]">
          <span className="text-[11px] font-bold text-[#727783] uppercase tracking-wider">
            User Manager
          </span>
        </div>

        <button
          onClick={() => onTabChange('users')}
          className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors text-left w-full ${
            currentTab === 'users'
              ? 'bg-[#80f98b] text-[#007327] font-semibold'
              : 'text-[#424751] hover:bg-[#dbe4ed] hover:text-[#003d7c]'
          }`}
        >
          <span className="material-symbols-outlined mr-3 text-[20px]">group</span>
          <span>Users</span>
        </button>

        <button
          onClick={() => onTabChange('usage')}
          className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors text-left w-full ${
            currentTab === 'usage'
              ? 'bg-[#80f98b] text-[#007327] font-semibold'
              : 'text-[#424751] hover:bg-[#dbe4ed] hover:text-[#003d7c]'
          }`}
        >
          <span className="material-symbols-outlined mr-3 text-[20px]">data_usage</span>
          <span>Users Usage</span>
        </button>

        <button
          onClick={() => onTabChange('sessions')}
          className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors text-left w-full ${
            currentTab === 'sessions'
              ? 'bg-[#80f98b] text-[#007327] font-semibold'
              : 'text-[#424751] hover:bg-[#dbe4ed] hover:text-[#003d7c]'
          }`}
        >
          <span className="material-symbols-outlined mr-3 text-[20px]">wifi_tethering</span>
          <span>Active Sessions</span>
        </button>

        <button
          onClick={() => onTabChange('vouchers')}
          className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors text-left w-full ${
            currentTab === 'vouchers'
              ? 'bg-[#80f98b] text-[#007327] font-semibold'
              : 'text-[#424751] hover:bg-[#dbe4ed] hover:text-[#003d7c]'
          }`}
        >
          <span className="material-symbols-outlined mr-3 text-[20px]">confirmation_number</span>
          <span>Voucher Studio</span>
        </button>

        <button
          onClick={() => onTabChange('reports')}
          className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors text-left w-full ${
            currentTab === 'reports'
              ? 'bg-[#80f98b] text-[#007327] font-semibold'
              : 'text-[#424751] hover:bg-[#dbe4ed] hover:text-[#003d7c]'
          }`}
        >
          <span className="material-symbols-outlined mr-3 text-[20px]">analytics</span>
          <span>Usage Reports</span>
        </button>
      </div>

      {/* Bottom system actions */}
      <div className="p-3 border-t border-[#dbe4ed] space-y-2">
        <button
          onClick={onOpenFirewallGuide}
          className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs text-[#003d7c] hover:bg-[#e6eff8] font-medium transition-colors"
        >
          <ShieldCheck className="w-4 h-4 text-[#0054a6]" />
          <span>Firewall & API-SSL</span>
        </button>

        <a
          href={api.getDownloadZipUrl()}
          className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs text-[#0054a6] bg-[#e6eff8] hover:bg-[#dbe4ed] font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export Complete ZIP</span>
        </a>

        <div className="px-3 pt-2 text-[11px] text-[#727783] flex items-center justify-between">
          <span>Node.js RouterOS v7/v6</span>
          <span className="w-2 h-2 rounded-full bg-[#006e25]"></span>
        </div>
      </div>
    </aside>
  );
};
