import React from 'react';
import { MainTab } from '../types';

interface BottomNavProps {
  currentTab: MainTab;
  onTabChange: (tab: MainTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange }) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 border-t border-[#c2c6d3] bg-[#f6faff] flex justify-around items-center h-16 px-2 pb-safe shadow-lg">
      {/* Dashboard */}
      <button
        onClick={() => onTabChange('dashboard')}
        className={`flex flex-col items-center justify-center px-4 py-1 rounded-full transition-all duration-200 ${
          currentTab === 'dashboard'
            ? 'bg-[#80f98b] text-[#007327] font-semibold'
            : 'text-[#424751] hover:text-[#003d7c]'
        }`}
      >
        <span className="material-symbols-outlined text-[22px]">dashboard</span>
        <span className="text-[11px] mt-0.5">Dashboard</span>
      </button>

      {/* Routers */}
      <button
        onClick={() => onTabChange('routers')}
        className={`flex flex-col items-center justify-center px-4 py-1 rounded-full transition-all duration-200 ${
          currentTab === 'routers'
            ? 'bg-[#80f98b] text-[#007327] font-semibold'
            : 'text-[#424751] hover:text-[#003d7c]'
        }`}
      >
        <span className="material-symbols-outlined text-[22px]">settings_input_antenna</span>
        <span className="text-[11px] mt-0.5">Routers</span>
      </button>

      {/* Users */}
      <button
        onClick={() => onTabChange('users')}
        className={`flex flex-col items-center justify-center px-4 py-1 rounded-full transition-all duration-200 ${
          currentTab === 'users'
            ? 'bg-[#80f98b] text-[#007327] font-semibold'
            : 'text-[#424751] hover:text-[#003d7c]'
        }`}
      >
        <span className="material-symbols-outlined text-[22px]">group</span>
        <span className="text-[11px] mt-0.5">Users</span>
      </button>

      {/* Usage */}
      <button
        onClick={() => onTabChange('usage')}
        className={`flex flex-col items-center justify-center px-4 py-1 rounded-full transition-all duration-200 ${
          currentTab === 'usage'
            ? 'bg-[#80f98b] text-[#007327] font-semibold'
            : 'text-[#424751] hover:text-[#003d7c]'
        }`}
      >
        <span className="material-symbols-outlined text-[22px]">data_usage</span>
        <span className="text-[11px] mt-0.5">Usage</span>
      </button>

      {/* Reports */}
      <button
        onClick={() => onTabChange('reports')}
        className={`flex flex-col items-center justify-center px-4 py-1 rounded-full transition-all duration-200 ${
          currentTab === 'reports'
            ? 'bg-[#80f98b] text-[#007327] font-semibold'
            : 'text-[#424751] hover:text-[#003d7c]'
        }`}
      >
        <span className="material-symbols-outlined text-[22px]">analytics</span>
        <span className="text-[11px] mt-0.5">Reports</span>
      </button>
    </nav>
  );
};
