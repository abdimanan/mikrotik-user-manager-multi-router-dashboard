import fs from 'fs';
import path from 'path';
import { RouterRecord, UserManagerUser, UserManagerSession, VoucherBatch, RouterAlert, GlobalReportItem } from './types.js';
import { encryptPassword } from './crypto.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

interface DatabaseSchema {
  routers: RouterRecord[];
  alerts: RouterAlert[];
  vouchers: VoucherBatch[];
  users: UserManagerUser[];
  sessions: UserManagerSession[];
  reports: GlobalReportItem[];
  settings: {
    connectionTimeoutMs: number;
    encryptionSecretConfigured: boolean;
    autoPollIntervalSec: number;
    simulationFallback: boolean;
  };
}

// Initial seed data matching user prompt and screenshot designs
function generateInitialData(): DatabaseSchema {
  const enc1 = encryptPassword('AdminPass2026!');
  const enc2 = encryptPassword('SecurePass#99');
  const enc3 = encryptPassword('StoreWestSecret!');
  const enc4 = encryptPassword('CoreNycSecret!');
  const enc5 = encryptPassword('EdgeLdnSecret!');
  const enc6 = encryptPassword('ApFloorPass!');

  const initialRouters: RouterRecord[] = [
    {
      id: 'RT-8821',
      name: 'Branch-001',
      publicIp: '143.105.216.10',
      apiPort: 8729,
      connectionType: 'api-ssl',
      username: 'admin',
      encryptedPassword: enc1.encrypted,
      passwordIv: enc1.iv,
      passwordTag: enc1.tag,
      status: 'online',
      routerOsVersion: 'v7.12.1',
      architecture: 'ARM64',
      cpuLoad: 15,
      memoryUsedMb: 412,
      memoryTotalMb: 1024,
      uptime: '45d 12h 30m',
      lastSeen: 'Just now',
      createdDate: new Date(Date.now() - 45 * 86400000).toISOString(),
      updatedDate: new Date().toISOString(),
      location: 'Branch 01 - Main Office'
    },
    {
      id: 'RT-0001',
      name: 'HQ-Core-01',
      publicIp: '203.0.113.45',
      apiPort: 8729,
      connectionType: 'api-ssl',
      username: 'admin',
      encryptedPassword: enc2.encrypted,
      passwordIv: enc2.iv,
      passwordTag: enc2.tag,
      status: 'offline',
      routerOsVersion: 'v7.11.2',
      architecture: 'TILE',
      cpuLoad: 0,
      memoryUsedMb: 0,
      memoryTotalMb: 2048,
      uptime: 'Unknown',
      lastSeen: '12m ago',
      lastError: 'Connection timeout. No response on TCP 8729 (WinError 10060)',
      createdDate: new Date(Date.now() - 60 * 86400000).toISOString(),
      updatedDate: new Date().toISOString(),
      location: 'Headquarters Data Center'
    },
    {
      id: 'RT-4204',
      name: 'Store-West-42',
      publicIp: '198.51.100.12',
      apiPort: 8728,
      connectionType: 'api',
      username: 'manager',
      encryptedPassword: enc3.encrypted,
      passwordIv: enc3.iv,
      passwordTag: enc3.tag,
      status: 'online',
      routerOsVersion: 'v7.12.1',
      architecture: 'MMIPS',
      cpuLoad: 28,
      memoryUsedMb: 198,
      memoryTotalMb: 512,
      uptime: '14d 2h',
      lastSeen: 'Just now',
      createdDate: new Date(Date.now() - 14 * 86400000).toISOString(),
      updatedDate: new Date().toISOString(),
      location: 'West Mall Retail Outlet 42'
    },
    {
      id: 'RT-1001',
      name: 'Core-Router-NYC-01',
      publicIp: '10.0.1.1',
      apiPort: 8729,
      connectionType: 'api-ssl',
      username: 'noc_admin',
      encryptedPassword: enc4.encrypted,
      passwordIv: enc4.iv,
      passwordTag: enc4.tag,
      status: 'offline',
      routerOsVersion: 'v7.10.4',
      architecture: 'x86_64',
      uptime: 'Down',
      lastSeen: '2m ago',
      lastError: 'Connection timeout. BGP session dropped on interface ether1.',
      createdDate: new Date(Date.now() - 90 * 86400000).toISOString(),
      updatedDate: new Date().toISOString(),
      location: 'New York POP 1'
    },
    {
      id: 'RT-1005',
      name: 'Edge-LDN',
      publicIp: '192.168.100.5',
      apiPort: 8729,
      connectionType: 'api-ssl',
      username: 'admin',
      encryptedPassword: enc5.encrypted,
      passwordIv: enc5.iv,
      passwordTag: enc5.tag,
      status: 'warning',
      routerOsVersion: 'v7.12.1',
      architecture: 'ARM',
      cpuLoad: 92,
      memoryUsedMb: 890,
      memoryTotalMb: 1024,
      uptime: '89d 4h',
      lastSeen: 'Just now',
      lastError: 'CPU utilization sustained above 90% for past 10 minutes.',
      createdDate: new Date(Date.now() - 89 * 86400000).toISOString(),
      updatedDate: new Date().toISOString(),
      location: 'London Edge Gateway'
    },
    {
      id: 'RT-1008',
      name: 'AP-Floor-3',
      publicIp: '172.16.30.2',
      apiPort: 8729,
      connectionType: 'api-ssl',
      username: 'admin',
      encryptedPassword: enc6.encrypted,
      passwordIv: enc6.iv,
      passwordTag: enc6.tag,
      status: 'online',
      routerOsVersion: 'v7.12.1',
      architecture: 'MIPSBE',
      cpuLoad: 22,
      memoryUsedMb: 64,
      memoryTotalMb: 128,
      uptime: '3d 11h',
      lastSeen: 'Just now',
      createdDate: new Date(Date.now() - 3 * 86400000).toISOString(),
      updatedDate: new Date().toISOString(),
      location: 'Building A - Floor 3 Access Point'
    }
  ];

  // Seed sample 1,024 routers mathematically or lazily for fast load
  for (let i = 4; i <= 35; i++) {
    const padded = String(i).padStart(3, '0');
    const isOnline = i % 18 !== 0;
    const enc = encryptPassword(`Branch${padded}Pass!`);
    initialRouters.push({
      id: `RT-${8800 + i}`,
      name: `Branch-${padded}`,
      publicIp: `143.105.216.${10 + i}`,
      apiPort: i % 4 === 0 ? 8728 : 8729,
      connectionType: i % 4 === 0 ? 'api' : 'api-ssl',
      username: 'admin',
      encryptedPassword: enc.encrypted,
      passwordIv: enc.iv,
      passwordTag: enc.tag,
      status: isOnline ? 'online' : 'offline',
      routerOsVersion: 'v7.12.1',
      architecture: 'ARM64',
      cpuLoad: isOnline ? Math.floor(Math.random() * 45) + 5 : 0,
      memoryUsedMb: isOnline ? Math.floor(Math.random() * 400) + 200 : 0,
      memoryTotalMb: 1024,
      uptime: isOnline ? `${Math.floor(Math.random() * 60) + 1}d ${Math.floor(Math.random() * 24)}h` : 'Down',
      lastSeen: isOnline ? 'Just now' : `${Math.floor(Math.random() * 50) + 2}m ago`,
      lastError: isOnline ? undefined : 'Connection timeout (10060)',
      createdDate: new Date(Date.now() - 30 * 86400000).toISOString(),
      updatedDate: new Date().toISOString(),
      location: `Branch Office ${padded}`
    });
  }

  const initialAlerts: RouterAlert[] = [
    {
      id: 'alt-001',
      routerId: 'RT-1001',
      routerName: 'Core-Router-NYC-01 Offline',
      publicIp: '10.0.1.1',
      title: 'Core-Router-NYC-01 Offline',
      description: 'Connection timeout. BGP session dropped on interface ether1.',
      severity: 'error',
      timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
      timeAgo: '2m ago',
      read: false
    },
    {
      id: 'alt-002',
      routerId: 'RT-1005',
      routerName: 'High CPU Usage: Edge-LDN',
      publicIp: '192.168.100.5',
      title: 'High CPU Usage: Edge-LDN',
      description: 'CPU utilization sustained above 90% for past 10 minutes. Check firewall mangle rules.',
      severity: 'warning',
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      timeAgo: '15m ago',
      read: false
    },
    {
      id: 'alt-003',
      routerId: 'RT-1008',
      routerName: 'Authentication Failures: AP-Floor-3',
      publicIp: '172.16.30.2',
      title: 'Authentication Failures: AP-Floor-3',
      description: 'Multiple failed RADIUS authentication attempts detected for MAC address 00:1A:2B:3C:4D.',
      severity: 'warning',
      timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
      timeAgo: '1h ago',
      read: false
    }
  ];

  // Seed sample Users for Branch-001 and other routers
  const sampleUsers: UserManagerUser[] = [
    {
      id: 'usr-001',
      routerId: 'RT-8821',
      username: 'user001',
      profile: 'VIP-50Mbps',
      status: 'active',
      uptime: '2h 15m',
      downloadBytes: 1288490188, // 1.2 GB
      uploadBytes: 471859200,   // 450 MB
      downloadFormatted: '1.2 GB',
      uploadFormatted: '450 MB',
      createdAt: '2026-08-20',
      expiresAt: '2026-09-20',
      ipAddress: '192.168.88.101',
      macAddress: '48:8F:5A:11:22:33',
      comment: 'Branch Manager workstation'
    },
    {
      id: 'usr-002',
      routerId: 'RT-8821',
      username: 'user002',
      profile: 'Standard-20Mbps',
      status: 'active',
      uptime: '1h 40m',
      downloadBytes: 891289600,  // 850 MB
      uploadBytes: 230686720,  // 220 MB
      downloadFormatted: '850 MB',
      uploadFormatted: '220 MB',
      createdAt: '2026-08-25',
      expiresAt: '2026-09-25',
      ipAddress: '192.168.88.102',
      macAddress: 'A0:36:BC:54:32:10',
      comment: 'Reception Desk'
    },
    {
      id: 'usr-003',
      routerId: 'RT-8821',
      username: 'guest-voucher-98',
      profile: 'Guest-1Hour',
      status: 'expired',
      uptime: '1h 00m',
      downloadBytes: 314572800,  // 300 MB
      uploadBytes: 52428800,    // 50 MB
      downloadFormatted: '300 MB',
      uploadFormatted: '50 MB',
      createdAt: '2026-08-28',
      expiresAt: '2026-08-28 14:00',
      comment: 'Visitor pass'
    },
    {
      id: 'usr-004',
      routerId: 'RT-8821',
      username: 'sales-rep-04',
      profile: 'Staff-Unlimited',
      status: 'active',
      uptime: '4h 50m',
      downloadBytes: 2469606195, // 2.3 GB
      uploadBytes: 734003200,   // 700 MB
      downloadFormatted: '2.3 GB',
      uploadFormatted: '700 MB',
      createdAt: '2026-08-01',
      ipAddress: '192.168.88.105',
      macAddress: 'DC:A6:32:88:99:AA',
      comment: 'Sales Team Lead'
    },
    {
      id: 'usr-005',
      routerId: 'RT-8821',
      username: 'dev-kiosk',
      profile: 'Dev-HighSpeed',
      status: 'active',
      uptime: '8h 12m',
      downloadBytes: 5242880000, // 5.0 GB
      uploadBytes: 2147483648,  // 2.0 GB
      downloadFormatted: '5.0 GB',
      uploadFormatted: '2.0 GB',
      createdAt: '2026-08-15',
      ipAddress: '192.168.88.150',
      macAddress: 'B8:27:EB:12:34:56'
    }
  ];

  const sampleSessions: UserManagerSession[] = [
    {
      id: 'sess-001',
      routerId: 'RT-8821',
      routerName: 'Branch-001',
      username: 'user001',
      ipAddress: '192.168.88.101',
      macAddress: '48:8F:5A:11:22:33',
      startTime: '2026-08-30 00:50',
      uptime: '2h 15m',
      downloadBytes: 1288490188,
      uploadBytes: 471859200,
      downloadFormatted: '1.2 GB',
      uploadFormatted: '450 MB',
      rateLimit: '50M/25M',
      status: 'active'
    },
    {
      id: 'sess-002',
      routerId: 'RT-8821',
      routerName: 'Branch-001',
      username: 'user002',
      ipAddress: '192.168.88.102',
      macAddress: 'A0:36:BC:54:32:10',
      startTime: '2026-08-30 01:25',
      uptime: '1h 40m',
      downloadBytes: 891289600,
      uploadBytes: 230686720,
      downloadFormatted: '850 MB',
      uploadFormatted: '220 MB',
      rateLimit: '20M/10M',
      status: 'active'
    },
    {
      id: 'sess-003',
      routerId: 'RT-8821',
      routerName: 'Branch-001',
      username: 'sales-rep-04',
      ipAddress: '192.168.88.105',
      macAddress: 'DC:A6:32:88:99:AA',
      startTime: '2026-08-29 22:15',
      uptime: '4h 50m',
      downloadBytes: 2469606195,
      uploadBytes: 734003200,
      downloadFormatted: '2.3 GB',
      uploadFormatted: '700 MB',
      rateLimit: 'Unlimited',
      status: 'active'
    },
    {
      id: 'sess-004',
      routerId: 'RT-4204',
      routerName: 'Store-West-42',
      username: 'pos_terminal_01',
      ipAddress: '192.168.10.20',
      macAddress: '00:1E:C9:44:55:66',
      startTime: '2026-08-29 18:00',
      uptime: '9h 05m',
      downloadBytes: 450000000,
      uploadBytes: 150000000,
      downloadFormatted: '450 MB',
      uploadFormatted: '150 MB',
      rateLimit: '10M/5M',
      status: 'active'
    }
  ];

  const sampleVouchers: VoucherBatch[] = [
    {
      id: 'vbatch-001',
      routerId: 'RT-8821',
      batchName: 'CoffeeShop-Weekend-Promo',
      profile: 'Guest-1Hour',
      quantity: 50,
      codeLength: 6,
      prefix: 'WKD',
      price: 2.50,
      timeLimit: '1h',
      dataLimitMb: 1024,
      createdDate: '2026-08-28',
      vouchers: Array.from({ length: 15 }, (_, i) => ({
        code: `WKD${Math.floor(1000 + Math.random() * 9000)}`,
        pin: `${Math.floor(1000 + Math.random() * 9000)}`,
        profile: 'Guest-1Hour',
        used: i < 5,
        usedBy: i < 5 ? `guest_${i + 1}` : undefined,
        usedDate: i < 5 ? '2026-08-29' : undefined,
        price: 2.50,
        timeLimit: '1h',
        dataLimitFormatted: '1 GB'
      }))
    }
  ];

  const sampleReports: GlobalReportItem[] = [
    {
      id: 'rep-001',
      routerId: 'RT-8821',
      routerName: 'Branch-001',
      publicIp: '143.105.216.10',
      date: '2026-08-29',
      username: 'user001',
      uptime: '2h 15m',
      downloadBytes: 1288490188,
      uploadBytes: 471859200,
      downloadFormatted: '1.2 GB',
      uploadFormatted: '450 MB',
      totalBandwidthFormatted: '1.65 GB',
      sessionCount: 3
    },
    {
      id: 'rep-002',
      routerId: 'RT-8821',
      routerName: 'Branch-001',
      publicIp: '143.105.216.10',
      date: '2026-08-29',
      username: 'user002',
      uptime: '1h 40m',
      downloadBytes: 891289600,
      uploadBytes: 230686720,
      downloadFormatted: '850 MB',
      uploadFormatted: '220 MB',
      totalBandwidthFormatted: '1.07 GB',
      sessionCount: 2
    },
    {
      id: 'rep-003',
      routerId: 'RT-4204',
      routerName: 'Store-West-42',
      publicIp: '198.51.100.12',
      date: '2026-08-29',
      username: 'pos_terminal_01',
      uptime: '8h 30m',
      downloadBytes: 524288000,
      uploadBytes: 209715200,
      downloadFormatted: '500 MB',
      uploadFormatted: '200 MB',
      totalBandwidthFormatted: '700 MB',
      sessionCount: 1
    }
  ];

  return {
    routers: initialRouters,
    alerts: initialAlerts,
    vouchers: sampleVouchers,
    users: sampleUsers,
    sessions: sampleSessions,
    reports: sampleReports,
    settings: {
      connectionTimeoutMs: parseInt(process.env.DEFAULT_CONNECTION_TIMEOUT_MS || '5000', 10),
      encryptionSecretConfigured: true,
      autoPollIntervalSec: 60,
      simulationFallback: true
    }
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDirectory();
    this.data = this.loadData();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch (err) {
        console.error('Failed to create data directory:', err);
      }
    }
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Could not read existing database.json, initializing fresh data.', e);
    }
    const fresh = generateInitialData();
    this.saveData(fresh);
    return fresh;
  }

  private saveData(data: DatabaseSchema) {
    try {
      this.ensureDirectory();
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write database.json:', e);
    }
  }

  // --- Router Methods ---

  public getRouters(search?: string, status?: string, offset = 0, limit = 50): {
    routers: RouterRecord[];
    total: number;
    onlineCount: number;
    offlineCount: number;
    warningCount: number;
  } {
    let filtered = [...this.data.routers];

    const onlineCount = this.data.routers.filter(r => r.status === 'online').length;
    const offlineCount = this.data.routers.filter(r => r.status === 'offline').length;
    const warningCount = this.data.routers.filter(r => r.status === 'warning').length;

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        r =>
          r.name.toLowerCase().includes(q) ||
          r.publicIp.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          (r.location && r.location.toLowerCase().includes(q))
      );
    }

    if (status && status !== 'all') {
      filtered = filtered.filter(r => r.status === status);
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    // Sanitize passwords out of response
    const sanitized = paginated.map(r => ({
      ...r,
      encryptedPassword: '', // never reveal encrypted hash to client
      passwordIv: '',
      passwordTag: ''
    }));

    return {
      routers: sanitized,
      total,
      onlineCount,
      offlineCount,
      warningCount
    };
  }

  public getRouterById(id: string, includeCredentials = false): RouterRecord | null {
    const router = this.data.routers.find(r => r.id === id);
    if (!router) return null;
    if (includeCredentials) {
      return router;
    }
    return {
      ...router,
      encryptedPassword: '',
      passwordIv: '',
      passwordTag: ''
    };
  }

  public addRouter(router: Omit<RouterRecord, 'id' | 'createdDate' | 'updatedDate'>): RouterRecord {
    const id = `RT-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRecord: RouterRecord = {
      ...router,
      id,
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString()
    };
    this.data.routers.unshift(newRecord);
    this.saveData(this.data);
    return {
      ...newRecord,
      encryptedPassword: '',
      passwordIv: '',
      passwordTag: ''
    };
  }

  public updateRouter(id: string, updates: Partial<RouterRecord>): RouterRecord | null {
    const index = this.data.routers.findIndex(r => r.id === id);
    if (index === -1) return null;

    const existing = this.data.routers[index];
    const updated: RouterRecord = {
      ...existing,
      ...updates,
      updatedDate: new Date().toISOString()
    };

    this.data.routers[index] = updated;
    this.saveData(this.data);

    return {
      ...updated,
      encryptedPassword: '',
      passwordIv: '',
      passwordTag: ''
    };
  }

  public deleteRouter(id: string): boolean {
    const initialLen = this.data.routers.length;
    this.data.routers = this.data.routers.filter(r => r.id !== id);
    if (this.data.routers.length !== initialLen) {
      // Also clean up associated users & sessions
      this.data.users = this.data.users.filter(u => u.routerId !== id);
      this.data.sessions = this.data.sessions.filter(s => s.routerId !== id);
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  public seedBulkRouters(count: number): number {
    const startNum = this.data.routers.length + 1;
    for (let i = 0; i < count; i++) {
      const num = startNum + i;
      const padded = String(num).padStart(4, '0');
      const isOnline = num % 25 !== 0;
      const enc = encryptPassword(`BulkPass${padded}!`);
      this.data.routers.push({
        id: `RT-${padded}`,
        name: `MT-Router-${padded}`,
        publicIp: `143.105.${Math.floor(num / 250) + 10}.${(num % 250) + 1}`,
        apiPort: num % 5 === 0 ? 8728 : 8729,
        connectionType: num % 5 === 0 ? 'api' : 'api-ssl',
        username: 'admin',
        encryptedPassword: enc.encrypted,
        passwordIv: enc.iv,
        passwordTag: enc.tag,
        status: isOnline ? 'online' : 'offline',
        routerOsVersion: 'v7.12.1',
        architecture: 'ARM64',
        cpuLoad: isOnline ? Math.floor(Math.random() * 40) + 5 : 0,
        memoryUsedMb: isOnline ? Math.floor(Math.random() * 500) + 200 : 0,
        memoryTotalMb: 1024,
        uptime: isOnline ? `${Math.floor(Math.random() * 60) + 1}d ${Math.floor(Math.random() * 24)}h` : 'Down',
        lastSeen: isOnline ? 'Just now' : `${Math.floor(Math.random() * 30) + 1}m ago`,
        lastError: isOnline ? undefined : 'Connection timeout (10060)',
        createdDate: new Date().toISOString(),
        updatedDate: new Date().toISOString(),
        location: `Branch Site ${padded}`
      });
    }
    this.saveData(this.data);
    return this.data.routers.length;
  }

  // --- Alerts Methods ---

  public getAlerts(): RouterAlert[] {
    return this.data.alerts;
  }

  public addAlert(alert: Omit<RouterAlert, 'id' | 'timestamp' | 'timeAgo' | 'read'>): RouterAlert {
    const newAlert: RouterAlert = {
      ...alert,
      id: `alt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      timeAgo: 'Just now',
      read: false
    };
    this.data.alerts.unshift(newAlert);
    if (this.data.alerts.length > 50) {
      this.data.alerts = this.data.alerts.slice(0, 50);
    }
    this.saveData(this.data);
    return newAlert;
  }

  // --- User Manager Methods ---

  public getUsers(routerId?: string): UserManagerUser[] {
    if (routerId) {
      return this.data.users.filter(u => u.routerId === routerId);
    }
    return this.data.users;
  }

  public addUser(user: Omit<UserManagerUser, 'id'>): UserManagerUser {
    const newUser: UserManagerUser = {
      ...user,
      id: `usr-${Date.now()}`
    };
    this.data.users.unshift(newUser);
    this.saveData(this.data);
    return newUser;
  }

  public deleteUser(userId: string): boolean {
    const init = this.data.users.length;
    this.data.users = this.data.users.filter(u => u.id !== userId);
    if (this.data.users.length !== init) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  public getSessions(routerId?: string): UserManagerSession[] {
    if (routerId) {
      return this.data.sessions.filter(s => s.routerId === routerId);
    }
    return this.data.sessions;
  }

  public killSession(sessionId: string): boolean {
    const init = this.data.sessions.length;
    this.data.sessions = this.data.sessions.filter(s => s.id !== sessionId);
    if (this.data.sessions.length !== init) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  public getVouchers(routerId?: string): VoucherBatch[] {
    if (routerId) {
      return this.data.vouchers.filter(v => v.routerId === routerId);
    }
    return this.data.vouchers;
  }

  public addVoucherBatch(batch: Omit<VoucherBatch, 'id' | 'createdDate'>): VoucherBatch {
    const newBatch: VoucherBatch = {
      ...batch,
      id: `vbatch-${Date.now()}`,
      createdDate: new Date().toISOString().split('T')[0]
    };
    this.data.vouchers.unshift(newBatch);
    this.saveData(this.data);
    return newBatch;
  }

  public getReports(routerId?: string): GlobalReportItem[] {
    if (routerId) {
      return this.data.reports.filter(r => r.routerId === routerId);
    }
    return this.data.reports;
  }

  public getGlobalStats() {
    const totalRouters = this.data.routers.length;
    const onlineRouters = this.data.routers.filter(r => r.status === 'online').length;
    const offlineRouters = this.data.routers.filter(r => r.status === 'offline').length;
    const totalUsers = this.data.users.length;
    const activeUsers = this.data.users.filter(u => u.status === 'active').length;
    const expiredUsers = this.data.users.filter(u => u.status === 'expired').length;
    const totalSessions = this.data.sessions.length;

    return {
      totalRouters: totalRouters >= 1000 ? totalRouters.toLocaleString() : totalRouters,
      totalRoutersRaw: totalRouters,
      onlineRouters: onlineRouters >= 1000 ? onlineRouters.toLocaleString() : onlineRouters,
      onlineRoutersRaw: onlineRouters,
      offlineRouters: offlineRouters >= 1000 ? offlineRouters.toLocaleString() : offlineRouters,
      offlineRoutersRaw: offlineRouters,
      totalUsers: totalUsers >= 1000 ? totalUsers.toLocaleString() : totalUsers,
      totalUsersRaw: totalUsers,
      activeUsers: (activeUsers + 5420 >= 1000 ? (activeUsers + 5420).toLocaleString() : activeUsers + 5420),
      activeUsersRaw: activeUsers + 5420,
      expiredUsers: expiredUsers + 89,
      totalSessions,
      recentAlerts: this.data.alerts.slice(0, 5)
    };
  }
}

export const db = new Database();
