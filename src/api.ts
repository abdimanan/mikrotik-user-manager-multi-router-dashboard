import {
  GlobalStats,
  RouterRecord,
  UserManagerUser,
  UserManagerSession,
  VoucherBatch,
  GlobalReportItem,
  RouterAlert,
  ConnectionTestResult,
  PublicAppUser,
  AuditLogEntry
} from './types';

const BASE_URL = '/api';

export const api = {
  async login(username: string, password: string): Promise<PublicAppUser> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Login failed');
    return json.user;
  },

  async logout(): Promise<void> {
    await fetch(`${BASE_URL}/auth/logout`, { method: 'POST' });
  },

  async getCurrentUser(): Promise<PublicAppUser | null> {
    const res = await fetch(`${BASE_URL}/auth/me`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch session');
    return json.user;
  },

  async getAccounts(): Promise<PublicAppUser[]> {
    const res = await fetch(`${BASE_URL}/accounts`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch accounts');
    return json.accounts;
  },

  async createAccount(data: {
    username: string;
    password: string;
    role: PublicAppUser['role'];
    assignedRouterIds?: string[];
  }): Promise<PublicAppUser> {
    const res = await fetch(`${BASE_URL}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to create account');
    return json.account;
  },

  async updateAccount(
    id: string,
    updates: {
      role?: PublicAppUser['role'];
      assignedRouterIds?: string[];
      status?: 'active' | 'disabled';
      password?: string;
    }
  ): Promise<PublicAppUser> {
    const res = await fetch(`${BASE_URL}/accounts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update account');
    return json.account;
  },

  async getAuditLogs(params: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    targetType?: string;
    from?: string;
    to?: string;
  }): Promise<{
    logs: AuditLogEntry[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.userId) query.set('userId', params.userId);
    if (params.action) query.set('action', params.action);
    if (params.targetType) query.set('targetType', params.targetType);
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);

    const res = await fetch(`${BASE_URL}/logs?${query.toString()}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch audit logs');
    return json;
  },

  async getStats(): Promise<GlobalStats> {
    const res = await fetch(`${BASE_URL}/stats`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch stats');
    return json.stats;
  },

  async getRouters(params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    routers: RouterRecord[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
    counts: { total: number; online: number; offline: number; warning: number };
  }> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());

    const res = await fetch(`${BASE_URL}/routers?${query.toString()}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch routers');
    return json;
  },

  async getRouterById(id: string): Promise<RouterRecord> {
    const res = await fetch(`${BASE_URL}/routers/${id}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to fetch router');
    return json.router;
  },

  async addRouter(data: {
    name: string;
    publicIp: string;
    apiPort: number;
    connectionType: 'api' | 'api-ssl';
    username: string;
    password?: string;
    location?: string;
  }): Promise<RouterRecord> {
    const res = await fetch(`${BASE_URL}/routers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to add router');
    return json.router;
  },

  async updateRouter(id: string, data: Partial<RouterRecord> & { password?: string }): Promise<RouterRecord> {
    const res = await fetch(`${BASE_URL}/routers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to update router');
    return json.router;
  },

  async deleteRouter(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/routers/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to delete router');
  },

  async syncRouter(id: string): Promise<{
    router: RouterRecord;
    liveStats?: { downloadMbps: number; uploadMbps: number };
    error?: string;
  }> {
    const res = await fetch(`${BASE_URL}/routers/${id}/sync`, { method: 'POST' });
    const json = await res.json();
    return {
      router: json.router,
      liveStats: json.liveStats,
      error: json.success ? undefined : (json.error || 'Failed to sync router')
    };
  },

  async testConnection(data: {
    publicIp: string;
    apiPort: number;
    connectionType: 'api' | 'api-ssl';
    username: string;
    password?: string;
  }): Promise<ConnectionTestResult> {
    const res = await fetch(`${BASE_URL}/routers/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async seedBulkRouters(count: number): Promise<{ count: number; totalRouters: number }> {
    const res = await fetch(`${BASE_URL}/routers/seed-bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to seed bulk routers');
    return json;
  },

  async getRouterUsers(routerId: string): Promise<{
    users: UserManagerUser[];
    activeCount: number;
    expiredCount: number;
    totalCount: number;
    simulated: boolean;
  }> {
    const res = await fetch(`${BASE_URL}/routers/${routerId}/users`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch users');
    return json;
  },

  async addUser(routerId: string, data: Partial<UserManagerUser>): Promise<UserManagerUser> {
    const res = await fetch(`${BASE_URL}/routers/${routerId}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to add user');
    return json.user;
  },

  async deleteUser(routerId: string, userId: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/routers/${routerId}/users/${userId}`, {
      method: 'DELETE'
    });
    const json = await res.json();
    if (!json.success) throw new Error('Failed to delete user');
  },

  async getRouterSessions(routerId: string): Promise<{
    sessions: UserManagerSession[];
    simulated: boolean;
  }> {
    const res = await fetch(`${BASE_URL}/routers/${routerId}/sessions`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch sessions');
    return json;
  },

  async killSession(routerId: string, sessionId: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/routers/${routerId}/sessions/${sessionId}/kill`, {
      method: 'POST'
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to kill session');
  },

  async getRouterVouchers(routerId: string): Promise<VoucherBatch[]> {
    const res = await fetch(`${BASE_URL}/routers/${routerId}/vouchers`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch vouchers');
    return json.vouchers;
  },

  async generateVouchers(
    routerId: string,
    data: {
      batchName: string;
      profile: string;
      quantity: number;
      codeLength: number;
      prefix: string;
      price: number;
      timeLimit: string;
      dataLimitMb: number;
    }
  ): Promise<VoucherBatch> {
    const res = await fetch(`${BASE_URL}/routers/${routerId}/vouchers/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to generate vouchers');
    return json.batch;
  },

  async getRouterReports(routerId?: string, date?: string): Promise<GlobalReportItem[]> {
    const base = routerId ? `${BASE_URL}/routers/${routerId}/reports` : `${BASE_URL}/reports/global`;
    const url = date ? `${base}?date=${encodeURIComponent(date)}` : base;
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch reports');
    return json.reports;
  },

  async getAlerts(): Promise<RouterAlert[]> {
    const res = await fetch(`${BASE_URL}/alerts`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch alerts');
    return json.alerts;
  },

  getDownloadZipUrl(): string {
    return `${BASE_URL}/download/project-zip`;
  }
};
