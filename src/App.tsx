import React, { useState, useEffect, useCallback } from 'react';
import { MainTab, RouterRecord, GlobalStats, RouterAlert, VoucherBatch } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { RoutersView } from './components/RoutersView';
import { RouterDetailView } from './components/RouterDetailView';
import { UsersView } from './components/UsersView';
import { UsersUsageView } from './components/UsersUsageView';
import { SessionsView } from './components/SessionsView';
import { VouchersView } from './components/VouchersView';
import { ReportsView } from './components/ReportsView';
import { AddRouterModal } from './components/AddRouterModal';
import { TerminalModal } from './components/TerminalModal';
import { FirewallGuideModal } from './components/FirewallGuideModal';
import { AlertsModal } from './components/AlertsModal';
import { VoucherPrintModal } from './components/VoucherPrintModal';
import { api } from './api';

export default function App() {
  const [currentTab, setCurrentTab] = useState<MainTab>('dashboard');
  const [selectedRouterId, setSelectedRouterId] = useState<string | null>(null);
  const [selectedRouterForDetail, setSelectedRouterForDetail] = useState<RouterRecord | null>(null);

  // Global fleet state
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [alerts, setAlerts] = useState<RouterAlert[]>([]);
  const [routers, setRouters] = useState<RouterRecord[]>([]);
  const [totalRouters, setTotalRouters] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(false);

  // Modals state
  const [showAddRouterModal, setShowAddRouterModal] = useState<boolean>(false);
  const [routerToEdit, setRouterToEdit] = useState<RouterRecord | null>(null);
  const [terminalRouter, setTerminalRouter] = useState<RouterRecord | null>(null);
  const [showFirewallGuide, setShowFirewallGuide] = useState<boolean>(false);
  const [showAlertsModal, setShowAlertsModal] = useState<boolean>(false);
  const [printVoucherBatch, setPrintVoucherBatch] = useState<VoucherBatch | null>(null);

  // Fetch telemetry and global stats
  const fetchGlobalData = useCallback(async () => {
    try {
      const [statsRes, alertsRes] = await Promise.all([
        api.getStats(),
        api.getAlerts()
      ]);
      setStats(statsRes);
      setAlerts(alertsRes);
    } catch (err) {
      console.warn('Stats fetch warning:', err);
    }
  }, []);

  // Fetch paginated routers
  const fetchRouters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getRouters({
        search: searchQuery,
        status: statusFilter === 'all' ? undefined : statusFilter,
        page: currentPage,
        limit: 12
      });
      setRouters(res.routers);
      setTotalRouters(res.pagination.total);
      setTotalPages(res.pagination.totalPages);

      // If viewing a detail router, keep it synced
      if (selectedRouterId) {
        const found = res.routers.find(r => r.id === selectedRouterId);
        if (found) setSelectedRouterForDetail(found);
      }
    } catch (err) {
      console.error('Error fetching routers:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, currentPage, selectedRouterId]);

  useEffect(() => {
    fetchGlobalData();
  }, [fetchGlobalData]);

  useEffect(() => {
    fetchRouters();
  }, [fetchRouters]);

  // Handle router selection for detail view
  const handleSelectRouter = async (routerId: string) => {
    try {
      const r = await api.getRouterById(routerId);
      setSelectedRouterForDetail(r);
      setSelectedRouterId(routerId);
    } catch (e) {
      const cached = routers.find((item) => item.id === routerId);
      if (cached) {
        setSelectedRouterForDetail(cached);
        setSelectedRouterId(routerId);
      }
    }
  };

  const handleBackToRouters = () => {
    setSelectedRouterForDetail(null);
  };

  const handleNavigateToModule = (
    module: 'users' | 'sessions' | 'vouchers' | 'reports',
    routerId: string
  ) => {
    setSelectedRouterId(routerId);
    setCurrentTab(module);
  };

  const handleSyncRouter = async (routerId: string) => {
    try {
      await api.syncRouter(routerId);
      fetchRouters();
      fetchGlobalData();
    } catch (err) {
      console.error('Sync failed', err);
    }
  };

  const handleDeleteRouter = async (routerId: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete router "${name}"?`)) {
      try {
        await api.deleteRouter(routerId);
        if (selectedRouterForDetail?.id === routerId) {
          setSelectedRouterForDetail(null);
        }
        fetchRouters();
        fetchGlobalData();
      } catch (err) {
        console.error('Failed to delete router', err);
      }
    }
  };

  const handleSeedBulk = async () => {
    try {
      setLoading(true);
      await api.seedBulkRouters(100);
      await fetchRouters();
      await fetchGlobalData();
    } catch (err) {
      console.error('Failed to seed bulk routers', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: MainTab) => {
    setCurrentTab(tab);
    if (tab === 'routers') {
      setSelectedRouterForDetail(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6faff] flex flex-col antialiased text-[#141d23]">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onTabChange={handleTabChange}
        alerts={alerts}
        onOpenAlerts={() => setShowAlertsModal(true)}
        onOpenFirewallGuide={() => setShowFirewallGuide(true)}
        onOpenAddRouter={() => {
          setRouterToEdit(null);
          setShowAddRouterModal(true);
        }}
      />

      {/* Main Content Area with Desktop Sidebar */}
      <div className="flex-1 flex w-full">
        <Sidebar
          currentTab={currentTab}
          onTabChange={handleTabChange}
          onOpenFirewallGuide={() => setShowFirewallGuide(true)}
        />

        {/* Viewport Content with padding for bottom nav on mobile */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 md:pb-8 overflow-y-auto max-w-full">
          {currentTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              alerts={alerts}
              onOpenAddRouter={() => {
                setRouterToEdit(null);
                setShowAddRouterModal(true);
              }}
              onNavigateToRouters={(status) => {
                if (status) setStatusFilter(status);
                setCurrentTab('routers');
                setSelectedRouterForDetail(null);
              }}
              onNavigateToReports={() => setCurrentTab('reports')}
              onOpenAlerts={() => setShowAlertsModal(true)}
              onOpenFirewallGuide={() => setShowFirewallGuide(true)}
              onSeedBulk={handleSeedBulk}
              loading={loading}
            />
          )}

          {currentTab === 'routers' && (
            <>
              {selectedRouterForDetail ? (
                <RouterDetailView
                  router={selectedRouterForDetail}
                  onBack={handleBackToRouters}
                  onNavigateToModule={handleNavigateToModule}
                  onOpenTerminal={(r) => setTerminalRouter(r)}
                />
              ) : (
                <RoutersView
                  routers={routers}
                  totalRouters={totalRouters}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  searchQuery={searchQuery}
                  statusFilter={statusFilter}
                  onSearchChange={(q) => {
                    setSearchQuery(q);
                    setCurrentPage(1);
                  }}
                  onStatusFilterChange={(s) => {
                    setStatusFilter(s);
                    setCurrentPage(1);
                  }}
                  onPageChange={(p) => setCurrentPage(p)}
                  onSelectRouter={handleSelectRouter}
                  onOpenAddRouter={() => {
                    setRouterToEdit(null);
                    setShowAddRouterModal(true);
                  }}
                  onOpenEditRouter={(r) => {
                    setRouterToEdit(r);
                    setShowAddRouterModal(true);
                  }}
                  onDeleteRouter={handleDeleteRouter}
                  onSyncRouter={handleSyncRouter}
                  loading={loading}
                />
              )}
            </>
          )}

          {currentTab === 'users' && (
            <UsersView
              routers={routers}
              selectedRouterId={selectedRouterId || undefined}
              onSelectRouter={(id) => setSelectedRouterId(id)}
            />
          )}

          {currentTab === 'usage' && (
            <UsersUsageView
              routers={routers}
              selectedRouterId={selectedRouterId || undefined}
              onSelectRouter={(id) => setSelectedRouterId(id)}
            />
          )}

          {currentTab === 'sessions' && (
            <SessionsView
              routers={routers}
              selectedRouterId={selectedRouterId || undefined}
              onSelectRouter={(id) => setSelectedRouterId(id)}
            />
          )}

          {currentTab === 'vouchers' && (
            <VouchersView
              routers={routers}
              selectedRouterId={selectedRouterId || undefined}
              onOpenPrintModal={(batch) => setPrintVoucherBatch(batch)}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView
              routers={routers}
              selectedRouterId={selectedRouterId || undefined}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav currentTab={currentTab} onTabChange={handleTabChange} />

      {/* Modals */}
      {showAddRouterModal && (
        <AddRouterModal
          routerToEdit={routerToEdit}
          onClose={() => {
            setShowAddRouterModal(false);
            setRouterToEdit(null);
          }}
          onSaved={() => {
            setShowAddRouterModal(false);
            setRouterToEdit(null);
            fetchRouters();
            fetchGlobalData();
          }}
        />
      )}

      {terminalRouter && (
        <TerminalModal
          router={terminalRouter}
          onClose={() => setTerminalRouter(null)}
        />
      )}

      {showFirewallGuide && (
        <FirewallGuideModal
          onClose={() => setShowFirewallGuide(false)}
        />
      )}

      {showAlertsModal && (
        <AlertsModal
          alerts={alerts}
          onClose={() => setShowAlertsModal(false)}
        />
      )}

      {printVoucherBatch && (
        <VoucherPrintModal
          batch={printVoucherBatch}
          onClose={() => setPrintVoucherBatch(null)}
        />
      )}
    </div>
  );
}
