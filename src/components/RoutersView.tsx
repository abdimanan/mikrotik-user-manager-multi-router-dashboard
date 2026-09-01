import React, { useState } from 'react';
import { RouterRecord } from '../types';
import { Search, Filter, Plus, MoreVertical, Trash2, Edit2, LayoutDashboard, RefreshCw, AlertTriangle, CheckCircle2, WifiOff } from 'lucide-react';

interface RoutersViewProps {
  routers: RouterRecord[];
  totalRouters: number;
  currentPage: number;
  totalPages: number;
  searchQuery: string;
  statusFilter: string;
  onSearchChange: (query: string) => void;
  onStatusFilterChange: (status: string) => void;
  onPageChange: (page: number) => void;
  onSelectRouter: (routerId: string) => void;
  isSuperAdmin: boolean;
  canMutate: boolean;
  onOpenAddRouter: () => void;
  onOpenEditRouter: (router: RouterRecord) => void;
  onDeleteRouter: (routerId: string, name: string) => void;
  onSyncRouter: (routerId: string) => void;
  loading: boolean;
}

export const RoutersView: React.FC<RoutersViewProps> = ({
  routers,
  totalRouters,
  currentPage,
  totalPages,
  searchQuery,
  statusFilter,
  isSuperAdmin,
  canMutate,
  onSearchChange,
  onStatusFilterChange,
  onPageChange,
  onSelectRouter,
  onOpenAddRouter,
  onOpenEditRouter,
  onDeleteRouter,
  onSyncRouter,
  loading
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const startCount = totalRouters === 0 ? 0 : (currentPage - 1) * 12 + 1;
  const endCount = Math.min(currentPage * 12, totalRouters);

  return (
    <div className="flex-1 flex flex-col min-w-0 space-y-4 max-w-[1440px] mx-auto">
      {/* Page Header & Actions Bar */}
      <div className="bg-[#f6faff]/95 backdrop-blur-xs border-b border-[#c2c6d3] pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#141d23] tracking-tight">
              Routers
            </h1>
            <p className="text-xs md:text-sm text-[#424751] mt-0.5">
              Managing {totalRouters.toLocaleString()} active devices across network edges
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Bar */}
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#727783] text-[20px] group-focus-within:text-[#003d7c] transition-colors">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search Name, IP, ID..."
                className="w-full sm:w-64 pl-10 pr-4 py-2 bg-white border border-[#c2c6d3] rounded-lg text-sm text-[#141d23] focus:outline-none focus:border-[#003d7c] focus:ring-2 focus:ring-[#003d7c]/20 transition-all placeholder:text-[#727783]"
              />
            </div>

            {/* Filter Button & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2 bg-white border rounded-lg text-sm text-[#141d23] hover:bg-[#e6eff8] transition-colors ${
                  statusFilter !== 'all'
                    ? 'border-[#003d7c] text-[#003d7c] font-semibold bg-[#ecf5fe]'
                    : 'border-[#c2c6d3]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">filter_list</span>
                <span>
                  {statusFilter === 'all'
                    ? 'Filters'
                    : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                </span>
              </button>

              {showFilterMenu && (
                <div className="absolute right-0 mt-2 w-44 bg-white border border-[#c2c6d3] rounded-lg shadow-md z-30 py-1 text-sm">
                  <button
                    onClick={() => {
                      onStatusFilterChange('all');
                      setShowFilterMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-[#ecf5fe] ${
                      statusFilter === 'all' ? 'font-bold text-[#003d7c]' : 'text-[#424751]'
                    }`}
                  >
                    All Devices
                  </button>
                  <button
                    onClick={() => {
                      onStatusFilterChange('online');
                      setShowFilterMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-[#ecf5fe] flex items-center gap-2 ${
                      statusFilter === 'online' ? 'font-bold text-[#006e25]' : 'text-[#424751]'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#006e25]"></span>
                    <span>Online Only</span>
                  </button>
                  <button
                    onClick={() => {
                      onStatusFilterChange('offline');
                      setShowFilterMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-[#ecf5fe] flex items-center gap-2 ${
                      statusFilter === 'offline' ? 'font-bold text-[#ba1a1a]' : 'text-[#424751]'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#ba1a1a]"></span>
                    <span>Offline Only</span>
                  </button>
                </div>
              )}
            </div>

            {/* Add Router Button (Desktop) */}
            {isSuperAdmin && (
              <button
                onClick={onOpenAddRouter}
                className="hidden md:flex items-center justify-center gap-2 px-4 py-2 bg-[#003d7c] text-white rounded-lg text-sm font-semibold hover:bg-[#0054a6] transition-colors h-9 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Router</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Router Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-8">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white border border-[#c2c6d3] rounded-xl p-5 animate-pulse space-y-4">
              <div className="h-4 bg-[#e0e9f2] rounded w-1/2"></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="h-3 bg-[#e0e9f2] rounded"></div>
                <div className="h-3 bg-[#e0e9f2] rounded"></div>
                <div className="h-3 bg-[#e0e9f2] rounded"></div>
                <div className="h-3 bg-[#e0e9f2] rounded"></div>
              </div>
              <div className="h-8 bg-[#e0e9f2] rounded"></div>
            </div>
          ))}
        </div>
      ) : routers.length === 0 ? (
        <div className="bg-white border border-[#c2c6d3] rounded-xl p-12 text-center max-w-lg mx-auto my-8">
          <span className="material-symbols-outlined text-[48px] text-[#727783] mb-3">
            router
          </span>
          <h3 className="text-lg font-bold text-[#141d23]">No Routers Found</h3>
          <p className="text-sm text-[#424751] mt-1 mb-6">
            {searchQuery
              ? `No MikroTik devices matched "${searchQuery}".`
              : isSuperAdmin
              ? 'Add your first MikroTik router to start monitoring.'
              : 'No routers are assigned to your account yet.'}
          </p>
          {isSuperAdmin && (
            <button
              onClick={onOpenAddRouter}
              className="px-4 py-2 bg-[#003d7c] hover:bg-[#0054a6] text-white text-sm font-semibold rounded-lg inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Router</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {routers.map((router) => {
            const isOffline = router.status === 'offline';
            const isWarning = router.status === 'warning';

            return (
              <div
                key={router.id}
                className={`bg-white border rounded-xl p-4 flex flex-col transition-all relative group shadow-xs ${
                  isOffline
                    ? 'border-[#ffdad6] bg-[#fffbfa]'
                    : isWarning
                    ? 'border-[#ffdbcb] bg-[#fffcf9]'
                    : 'border-[#c2c6d3] hover:border-[#003d7c]'
                }`}
              >
                {/* Offline light tinted background overlay */}
                {isOffline && (
                  <div className="absolute inset-0 bg-[#ba1a1a]/5 rounded-xl pointer-events-none"></div>
                )}

                <div className="flex justify-between items-start mb-3 relative z-10">
                  <div className="flex items-center gap-3">
                    {/* Status Dot */}
                    {isOffline ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a] pulse-danger shrink-0"></div>
                    ) : isWarning ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ffb691] shrink-0"></div>
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#006e25] shrink-0"></div>
                    )}

                    <div>
                      <h3
                        onClick={() => onSelectRouter(router.id)}
                        className="text-base font-bold text-[#141d23] hover:text-[#003d7c] cursor-pointer"
                      >
                        {router.name}
                      </h3>
                      <span className="text-[11px] font-bold text-[#727783] uppercase tracking-wider">
                        ID: {router.id}
                      </span>
                    </div>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() =>
                        setActiveMenuId(activeMenuId === router.id ? null : router.id)
                      }
                      className="text-[#727783] hover:text-[#003d7c] p-1 rounded-full hover:bg-[#e6eff8] transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {activeMenuId === router.id && (
                      <div className="absolute right-0 mt-1 w-36 bg-white border border-[#c2c6d3] rounded-lg shadow-lg z-20 py-1 text-xs">
                        {canMutate && (
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onSyncRouter(router.id);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-[#e6eff8] flex items-center gap-2 text-[#141d23]"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Sync Telemetry</span>
                          </button>
                        )}
                        {canMutate && (
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onOpenEditRouter(router);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-[#e6eff8] flex items-center gap-2 text-[#141d23]"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit Config</span>
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onDeleteRouter(router.id, router.name);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-[#ffdad6] flex items-center gap-2 text-[#ba1a1a]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2x2 Specs Grid */}
                <div className="grid grid-cols-2 gap-y-3 gap-x-2 mb-4 flex-1 relative z-10 text-xs">
                  <div>
                    <span className="text-[11px] font-bold text-[#727783] uppercase block mb-0.5">
                      Public IP
                    </span>
                    <span className="font-mono text-sm font-medium text-[#141d23]">
                      {router.publicIp}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-[#727783] uppercase block mb-0.5">
                      Connection
                    </span>
                    {isOffline ? (
                      <span className="font-mono text-sm font-semibold text-[#ba1a1a]">
                        Timeout
                      </span>
                    ) : (
                      <span className="font-mono text-sm font-medium text-[#141d23]">
                        {router.connectionType === 'api-ssl' ? 'API-SSL: 8729' : 'API: 8728'}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-[#727783] uppercase block mb-0.5">
                      Version
                    </span>
                    <span className="font-mono text-sm text-[#141d23]">
                      {router.routerOsVersion || 'v7.12.1'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-[#727783] uppercase block mb-0.5">
                      {isOffline ? 'Last Seen' : 'Uptime'}
                    </span>
                    <span className="font-mono text-sm text-[#141d23]">
                      {isOffline ? router.lastSeen || '12m ago' : router.uptime || '42d 18h'}
                    </span>
                  </div>
                </div>

                {/* Bottom Card Actions */}
                <div className="flex justify-end gap-2 border-t border-[#dbe4ed] pt-3 mt-auto relative z-10">
                  {isSuperAdmin && (
                    <button
                      onClick={() => onDeleteRouter(router.id, router.name)}
                      className="px-3 h-8 flex items-center justify-center text-xs font-medium text-[#727783] hover:text-[#ba1a1a] hover:bg-[#ffdad6] rounded transition-colors"
                    >
                      Delete
                    </button>
                  )}

                  {canMutate && (
                    <button
                      onClick={() => onOpenEditRouter(router)}
                      className="px-3 h-8 flex items-center justify-center text-xs font-medium text-[#003d7c] hover:bg-[#003d7c]/10 rounded transition-colors"
                    >
                      Edit
                    </button>
                  )}

                  <button
                    onClick={() => onSelectRouter(router.id)}
                    className="px-3.5 h-8 flex items-center justify-center text-xs font-semibold bg-[#e6eff8] text-[#003d7c] rounded hover:bg-[#003d7c] hover:text-white transition-colors"
                  >
                    Dashboard
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compact Pagination matching Image 3 */}
      {totalRouters > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-4 border-t border-[#c2c6d3] gap-3">
          <span className="text-xs text-[#727783]">
            Showing {startCount}-{endCount} of {totalRouters.toLocaleString()}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="w-8 h-8 flex items-center justify-center rounded text-[#727783] hover:bg-[#dbe4ed] transition-colors disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`w-8 h-8 flex items-center justify-center rounded text-xs font-semibold ${
                    currentPage === pageNum
                      ? 'bg-[#0054a6] text-white'
                      : 'hover:bg-[#dbe4ed] text-[#141d23]'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {totalPages > 5 && (
              <span className="w-8 h-8 flex items-center justify-center text-[#727783]">...</span>
            )}

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="w-8 h-8 flex items-center justify-center rounded text-[#727783] hover:bg-[#dbe4ed] transition-colors disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Button (Mobile Only) */}
      {isSuperAdmin && (
        <button
          onClick={onOpenAddRouter}
          className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-[#003d7c] text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-[#0054a6] transition-all z-40 active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};
