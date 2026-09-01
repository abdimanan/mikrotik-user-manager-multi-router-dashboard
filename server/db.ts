import fs from 'fs';
import path from 'path';
import SqliteDatabase from 'better-sqlite3';
import { RouterRecord, UserManagerUser, UserManagerSession, VoucherBatch, RouterAlert, GlobalReportItem, AppUser, AuditLogEntry } from './types.js';
import { encryptPassword } from './crypto.js';
import { runMigrations } from './db/migrationRunner.js';
import { migrations } from './db/migrations/index.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const SQLITE_FILE = path.join(DATA_DIR, 'database.sqlite');
// Pre-SQLite storage format. If present on first run (and no database.sqlite
// exists yet), its contents are imported into SQLite once, then the file is
// archived to `database.json.bak` rather than deleted.
const LEGACY_JSON_FILE = path.join(DATA_DIR, 'database.json');

interface DatabaseSchema {
  routers: RouterRecord[];
  alerts: RouterAlert[];
  vouchers: VoucherBatch[];
  users: UserManagerUser[];
  sessions: UserManagerSession[];
  reports: GlobalReportItem[];
  appUsers: AppUser[];
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
    const id = `RT-${8800 + i}`;
    // i=21 produces 'RT-8821', which collides with the explicit Branch-001
    // router above - SQLite's PRIMARY KEY on routers.id rejects the duplicate.
    if (initialRouters.some((r) => r.id === id)) continue;

    const padded = String(i).padStart(3, '0');
    const isOnline = i % 18 !== 0;
    const enc = encryptPassword(`Branch${padded}Pass!`);
    initialRouters.push({
      id,
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
      group: 'default',
      active: 1,
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
      group: 'default',
      active: 0,
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
      group: 'default',
      active: 1,
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
    appUsers: [], // seeded separately by server/auth/seedSuperAdmin.ts
    settings: {
      connectionTimeoutMs: parseInt(process.env.DEFAULT_CONNECTION_TIMEOUT_MS || '5000', 10),
      encryptionSecretConfigured: true,
      autoPollIntervalSec: 60,
      simulationFallback: true
    }
  };
}

// SQLite stores every column as TEXT/INTEGER/REAL/NULL - these helpers convert
// between that and the optional-field-rich TS shapes above. Boolean fields are
// stored as 0/1; arrays/objects that don't merit their own table (RouterRecord.tags,
// the `settings` blob) are stored as JSON text.
function nullToUndefined<T>(v: T | null): T | undefined {
  return v === null ? undefined : v;
}

function rowToRouter(row: any): RouterRecord {
  return {
    id: row.id,
    name: row.name,
    publicIp: row.publicIp,
    apiPort: row.apiPort,
    connectionType: row.connectionType,
    username: row.username,
    encryptedPassword: row.encryptedPassword,
    passwordIv: row.passwordIv,
    passwordTag: row.passwordTag,
    status: row.status,
    routerOsVersion: nullToUndefined(row.routerOsVersion),
    architecture: nullToUndefined(row.architecture),
    cpuLoad: nullToUndefined(row.cpuLoad),
    memoryUsedMb: nullToUndefined(row.memoryUsedMb),
    memoryTotalMb: nullToUndefined(row.memoryTotalMb),
    uptime: nullToUndefined(row.uptime),
    lastSeen: nullToUndefined(row.lastSeen),
    lastError: nullToUndefined(row.lastError),
    createdDate: row.createdDate,
    updatedDate: row.updatedDate,
    location: nullToUndefined(row.location),
    tags: row.tags ? JSON.parse(row.tags) : undefined
  };
}

function rowToAlert(row: any): RouterAlert {
  return {
    id: row.id,
    routerId: nullToUndefined(row.routerId),
    routerName: nullToUndefined(row.routerName),
    publicIp: nullToUndefined(row.publicIp),
    title: row.title,
    description: row.description,
    severity: row.severity,
    timestamp: row.timestamp,
    timeAgo: row.timeAgo,
    read: row.read === 1
  };
}

function rowToUser(row: any): UserManagerUser {
  return {
    id: row.id,
    routerId: row.routerId,
    username: row.username,
    password: nullToUndefined(row.password),
    profile: row.profile,
    group: nullToUndefined(row.group),
    status: row.status,
    uptime: row.uptime,
    downloadBytes: row.downloadBytes,
    uploadBytes: row.uploadBytes,
    downloadFormatted: row.downloadFormatted,
    uploadFormatted: row.uploadFormatted,
    createdAt: row.createdAt,
    expiresAt: nullToUndefined(row.expiresAt),
    ipAddress: nullToUndefined(row.ipAddress),
    macAddress: nullToUndefined(row.macAddress),
    comment: nullToUndefined(row.comment),
    price: nullToUndefined(row.price),
    dataLimitBytes: nullToUndefined(row.dataLimitBytes),
    dataLimitFormatted: nullToUndefined(row.dataLimitFormatted),
    periodUsedBytes: nullToUndefined(row.periodUsedBytes),
    periodUsedFormatted: nullToUndefined(row.periodUsedFormatted),
    dataRemainingBytes: nullToUndefined(row.dataRemainingBytes),
    dataRemainingFormatted: nullToUndefined(row.dataRemainingFormatted),
    percentUsed: nullToUndefined(row.percentUsed),
    quotaResetsAt: nullToUndefined(row.quotaResetsAt),
    quotaResetInterval: nullToUndefined(row.quotaResetInterval)
  };
}

function rowToSession(row: any): UserManagerSession {
  return {
    id: row.id,
    routerId: row.routerId,
    routerName: row.routerName,
    username: row.username,
    ipAddress: row.ipAddress,
    macAddress: row.macAddress,
    startTime: row.startTime,
    uptime: row.uptime,
    downloadBytes: row.downloadBytes,
    uploadBytes: row.uploadBytes,
    downloadFormatted: row.downloadFormatted,
    uploadFormatted: row.uploadFormatted,
    rateLimit: nullToUndefined(row.rateLimit),
    status: row.status
  };
}

function rowToReport(row: any): GlobalReportItem {
  return {
    id: row.id,
    routerId: row.routerId,
    routerName: row.routerName,
    publicIp: row.publicIp,
    date: row.date,
    username: row.username,
    group: nullToUndefined(row.group),
    active: row.active,
    uptime: row.uptime,
    downloadBytes: row.downloadBytes,
    uploadBytes: row.uploadBytes,
    downloadFormatted: row.downloadFormatted,
    uploadFormatted: row.uploadFormatted,
    totalBandwidthFormatted: row.totalBandwidthFormatted,
    sessionCount: row.sessionCount
  };
}

function rowToVoucherCode(row: any): VoucherBatch['vouchers'][number] {
  return {
    code: row.code,
    pin: row.pin,
    profile: row.profile,
    used: row.used === 1,
    usedBy: nullToUndefined(row.usedBy),
    usedDate: nullToUndefined(row.usedDate),
    price: row.price,
    timeLimit: row.timeLimit,
    dataLimitFormatted: row.dataLimitFormatted
  };
}

function rowToAppUser(row: any): AppUser {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.passwordHash,
    role: row.role,
    assignedRouterIds: row.assignedRouterIds ? JSON.parse(row.assignedRouterIds) : [],
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastLoginAt: nullToUndefined(row.lastLoginAt),
    createdBy: nullToUndefined(row.createdBy)
  };
}

function rowToAuditLog(row: any): AuditLogEntry {
  return {
    id: row.id,
    userId: row.userId,
    username: row.username,
    role: row.role,
    action: row.action,
    targetType: row.targetType,
    targetId: nullToUndefined(row.targetId),
    detail: nullToUndefined(row.detail),
    timestamp: row.timestamp
  };
}

class Database {
  private data: DatabaseSchema;
  private sqlite: SqliteDatabase.Database;

  constructor() {
    this.ensureDirectory();
    this.sqlite = new SqliteDatabase(SQLITE_FILE);
    this.sqlite.pragma('journal_mode = WAL');
    runMigrations(this.sqlite, migrations);
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
    const routerCount = (this.sqlite.prepare('SELECT COUNT(*) as c FROM routers').get() as { c: number }).c;
    if (routerCount > 0) {
      return this.readAll();
    }

    // First run against this SQLite file: import the legacy JSON store if one
    // exists (so upgrading doesn't lose existing data), otherwise seed fresh.
    let fresh: DatabaseSchema;
    if (fs.existsSync(LEGACY_JSON_FILE)) {
      try {
        fresh = JSON.parse(fs.readFileSync(LEGACY_JSON_FILE, 'utf-8'));
      } catch (e) {
        console.warn('Could not read legacy database.json, initializing fresh data.', e);
        fresh = generateInitialData();
      }
    } else {
      fresh = generateInitialData();
    }

    // Migrations (e.g. the default super-admin seed) already wrote app_users
    // directly, before loadData ever ran - preserve that instead of letting a
    // legacy JSON's stale/missing appUsers field wipe it out below.
    fresh.appUsers = (this.sqlite.prepare('SELECT * FROM app_users').all() as any[]).map(rowToAppUser);

    this.saveData(fresh);

    if (fs.existsSync(LEGACY_JSON_FILE)) {
      try {
        fs.renameSync(LEGACY_JSON_FILE, `${LEGACY_JSON_FILE}.bak`);
      } catch (e) {
        console.warn('Could not archive legacy database.json:', e);
      }
    }

    return fresh;
  }

  private readAll(): DatabaseSchema {
    const routers = (this.sqlite.prepare('SELECT * FROM routers').all() as any[]).map(rowToRouter);
    const alerts = (this.sqlite.prepare('SELECT * FROM alerts').all() as any[]).map(rowToAlert);
    const users = (this.sqlite.prepare('SELECT * FROM users').all() as any[]).map(rowToUser);
    const sessions = (this.sqlite.prepare('SELECT * FROM sessions').all() as any[]).map(rowToSession);
    const reports = (this.sqlite.prepare('SELECT * FROM reports').all() as any[]).map(rowToReport);
    const appUsers = (this.sqlite.prepare('SELECT * FROM app_users').all() as any[]).map(rowToAppUser);

    const batchRows = this.sqlite.prepare('SELECT * FROM voucher_batches').all() as any[];
    const codeRows = this.sqlite.prepare('SELECT * FROM voucher_codes ORDER BY batchId, idx').all() as any[];
    const codesByBatch = new Map<string, VoucherBatch['vouchers']>();
    for (const c of codeRows) {
      const list = codesByBatch.get(c.batchId) || [];
      list.push(rowToVoucherCode(c));
      codesByBatch.set(c.batchId, list);
    }
    const vouchers: VoucherBatch[] = batchRows.map((b) => ({
      id: b.id,
      routerId: b.routerId,
      batchName: b.batchName,
      profile: b.profile,
      quantity: b.quantity,
      codeLength: b.codeLength,
      prefix: b.prefix,
      price: b.price,
      timeLimit: b.timeLimit,
      dataLimitMb: b.dataLimitMb,
      createdDate: b.createdDate,
      vouchers: codesByBatch.get(b.id) || []
    }));

    const settingsRow = this.sqlite.prepare("SELECT value FROM settings WHERE key = 'app'").get() as
      | { value: string }
      | undefined;
    const settings = settingsRow ? JSON.parse(settingsRow.value) : generateInitialData().settings;

    return { routers, alerts, vouchers, users, sessions, reports, appUsers, settings };
  }

  private saveData(data: DatabaseSchema) {
    const persist = this.sqlite.transaction((d: DatabaseSchema) => {
      this.sqlite.exec(`
        DELETE FROM routers;
        DELETE FROM alerts;
        DELETE FROM voucher_codes;
        DELETE FROM voucher_batches;
        DELETE FROM users;
        DELETE FROM sessions;
        DELETE FROM reports;
        DELETE FROM app_users;
      `);

      const insertRouter = this.sqlite.prepare(`
        INSERT INTO routers (id, name, publicIp, apiPort, connectionType, username, encryptedPassword, passwordIv, passwordTag, status, routerOsVersion, architecture, cpuLoad, memoryUsedMb, memoryTotalMb, uptime, lastSeen, lastError, createdDate, updatedDate, location, tags)
        VALUES (@id, @name, @publicIp, @apiPort, @connectionType, @username, @encryptedPassword, @passwordIv, @passwordTag, @status, @routerOsVersion, @architecture, @cpuLoad, @memoryUsedMb, @memoryTotalMb, @uptime, @lastSeen, @lastError, @createdDate, @updatedDate, @location, @tags)
      `);
      for (const r of d.routers) {
        insertRouter.run({
          ...r,
          routerOsVersion: r.routerOsVersion ?? null,
          architecture: r.architecture ?? null,
          cpuLoad: r.cpuLoad ?? null,
          memoryUsedMb: r.memoryUsedMb ?? null,
          memoryTotalMb: r.memoryTotalMb ?? null,
          uptime: r.uptime ?? null,
          lastSeen: r.lastSeen ?? null,
          lastError: r.lastError ?? null,
          location: r.location ?? null,
          tags: r.tags ? JSON.stringify(r.tags) : null
        });
      }

      const insertAlert = this.sqlite.prepare(`
        INSERT INTO alerts (id, routerId, routerName, publicIp, title, description, severity, timestamp, timeAgo, read)
        VALUES (@id, @routerId, @routerName, @publicIp, @title, @description, @severity, @timestamp, @timeAgo, @read)
      `);
      for (const a of d.alerts) {
        insertAlert.run({
          ...a,
          routerId: a.routerId ?? null,
          routerName: a.routerName ?? null,
          publicIp: a.publicIp ?? null,
          read: a.read ? 1 : 0
        });
      }

      const insertBatch = this.sqlite.prepare(`
        INSERT INTO voucher_batches (id, routerId, batchName, profile, quantity, codeLength, prefix, price, timeLimit, dataLimitMb, createdDate)
        VALUES (@id, @routerId, @batchName, @profile, @quantity, @codeLength, @prefix, @price, @timeLimit, @dataLimitMb, @createdDate)
      `);
      const insertCode = this.sqlite.prepare(`
        INSERT INTO voucher_codes (batchId, idx, code, pin, profile, used, usedBy, usedDate, price, timeLimit, dataLimitFormatted)
        VALUES (@batchId, @idx, @code, @pin, @profile, @used, @usedBy, @usedDate, @price, @timeLimit, @dataLimitFormatted)
      `);
      for (const v of d.vouchers) {
        const { vouchers: codes, ...batch } = v;
        insertBatch.run(batch);
        codes.forEach((c, idx) => {
          insertCode.run({
            ...c,
            batchId: v.id,
            idx,
            used: c.used ? 1 : 0,
            usedBy: c.usedBy ?? null,
            usedDate: c.usedDate ?? null
          });
        });
      }

      const insertUser = this.sqlite.prepare(`
        INSERT INTO users (id, routerId, username, password, profile, "group", status, uptime, downloadBytes, uploadBytes, downloadFormatted, uploadFormatted, createdAt, expiresAt, ipAddress, macAddress, comment, price, dataLimitBytes, dataLimitFormatted, periodUsedBytes, periodUsedFormatted, dataRemainingBytes, dataRemainingFormatted, percentUsed, quotaResetsAt, quotaResetInterval)
        VALUES (@id, @routerId, @username, @password, @profile, @group, @status, @uptime, @downloadBytes, @uploadBytes, @downloadFormatted, @uploadFormatted, @createdAt, @expiresAt, @ipAddress, @macAddress, @comment, @price, @dataLimitBytes, @dataLimitFormatted, @periodUsedBytes, @periodUsedFormatted, @dataRemainingBytes, @dataRemainingFormatted, @percentUsed, @quotaResetsAt, @quotaResetInterval)
      `);
      for (const u of d.users) {
        insertUser.run({
          ...u,
          password: u.password ?? null,
          group: u.group ?? null,
          expiresAt: u.expiresAt ?? null,
          ipAddress: u.ipAddress ?? null,
          macAddress: u.macAddress ?? null,
          comment: u.comment ?? null,
          price: u.price ?? null,
          dataLimitBytes: u.dataLimitBytes ?? null,
          dataLimitFormatted: u.dataLimitFormatted ?? null,
          periodUsedBytes: u.periodUsedBytes ?? null,
          periodUsedFormatted: u.periodUsedFormatted ?? null,
          dataRemainingBytes: u.dataRemainingBytes ?? null,
          dataRemainingFormatted: u.dataRemainingFormatted ?? null,
          percentUsed: u.percentUsed ?? null,
          quotaResetsAt: u.quotaResetsAt ?? null,
          quotaResetInterval: u.quotaResetInterval ?? null
        });
      }

      const insertSession = this.sqlite.prepare(`
        INSERT INTO sessions (id, routerId, routerName, username, ipAddress, macAddress, startTime, uptime, downloadBytes, uploadBytes, downloadFormatted, uploadFormatted, rateLimit, status)
        VALUES (@id, @routerId, @routerName, @username, @ipAddress, @macAddress, @startTime, @uptime, @downloadBytes, @uploadBytes, @downloadFormatted, @uploadFormatted, @rateLimit, @status)
      `);
      for (const s of d.sessions) {
        insertSession.run({ ...s, rateLimit: s.rateLimit ?? null });
      }

      const insertReport = this.sqlite.prepare(`
        INSERT INTO reports (id, routerId, routerName, publicIp, date, username, "group", active, uptime, downloadBytes, uploadBytes, downloadFormatted, uploadFormatted, totalBandwidthFormatted, sessionCount)
        VALUES (@id, @routerId, @routerName, @publicIp, @date, @username, @group, @active, @uptime, @downloadBytes, @uploadBytes, @downloadFormatted, @uploadFormatted, @totalBandwidthFormatted, @sessionCount)
      `);
      for (const r of d.reports) {
        insertReport.run({ ...r, group: r.group ?? null });
      }

      const insertAppUser = this.sqlite.prepare(`
        INSERT INTO app_users (id, username, passwordHash, role, assignedRouterIds, status, createdAt, updatedAt, lastLoginAt, createdBy)
        VALUES (@id, @username, @passwordHash, @role, @assignedRouterIds, @status, @createdAt, @updatedAt, @lastLoginAt, @createdBy)
      `);
      for (const u of d.appUsers) {
        insertAppUser.run({
          ...u,
          assignedRouterIds: JSON.stringify(u.assignedRouterIds),
          lastLoginAt: u.lastLoginAt ?? null,
          createdBy: u.createdBy ?? null
        });
      }

      this.sqlite
        .prepare(`
          INSERT INTO settings (key, value) VALUES ('app', @value)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `)
        .run({ value: JSON.stringify(d.settings) });
    });

    try {
      persist(data);
    } catch (e) {
      console.error('Failed to write to SQLite database:', e);
    }
  }

  // --- Router Methods ---

  // `restrictToIds`, when passed, scopes the entire result (list + counts) to
  // that router id set - used to limit an 'admin' role to their assigned
  // routers. Leave undefined for unrestricted roles (super-admin, viewer).
  public getRouters(search?: string, status?: string, offset = 0, limit = 50, restrictToIds?: string[]): {
    routers: RouterRecord[];
    total: number;
    onlineCount: number;
    offlineCount: number;
    warningCount: number;
  } {
    const scopeBase = restrictToIds
      ? this.data.routers.filter(r => restrictToIds.includes(r.id))
      : this.data.routers;
    let filtered = [...scopeBase];

    const onlineCount = scopeBase.filter(r => r.status === 'online').length;
    const offlineCount = scopeBase.filter(r => r.status === 'offline').length;
    const warningCount = scopeBase.filter(r => r.status === 'warning').length;

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

  public getAlerts(restrictToIds?: string[]): RouterAlert[] {
    if (restrictToIds) {
      return this.data.alerts.filter(a => a.routerId && restrictToIds.includes(a.routerId));
    }
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

  public getGlobalStats(restrictToIds?: string[]) {
    const routers = restrictToIds ? this.data.routers.filter(r => restrictToIds.includes(r.id)) : this.data.routers;
    const users = restrictToIds ? this.data.users.filter(u => restrictToIds.includes(u.routerId)) : this.data.users;
    const sessions = restrictToIds
      ? this.data.sessions.filter(s => restrictToIds.includes(s.routerId))
      : this.data.sessions;
    const alerts = restrictToIds
      ? this.data.alerts.filter(a => a.routerId && restrictToIds.includes(a.routerId))
      : this.data.alerts;

    const totalRouters = routers.length;
    const onlineRouters = routers.filter(r => r.status === 'online').length;
    const offlineRouters = routers.filter(r => r.status === 'offline').length;
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'active').length;
    const expiredUsers = users.filter(u => u.status === 'expired').length;
    const totalSessions = sessions.length;

    return {
      totalRouters: totalRouters >= 1000 ? totalRouters.toLocaleString() : totalRouters,
      totalRoutersRaw: totalRouters,
      onlineRouters: onlineRouters >= 1000 ? onlineRouters.toLocaleString() : onlineRouters,
      onlineRoutersRaw: onlineRouters,
      offlineRouters: offlineRouters >= 1000 ? offlineRouters.toLocaleString() : offlineRouters,
      offlineRoutersRaw: offlineRouters,
      totalUsers: totalUsers >= 1000 ? totalUsers.toLocaleString() : totalUsers,
      totalUsersRaw: totalUsers,
      activeUsers: activeUsers >= 1000 ? activeUsers.toLocaleString() : activeUsers,
      activeUsersRaw: activeUsers,
      expiredUsers,
      totalSessions,
      recentAlerts: alerts.slice(0, 5)
    };
  }

  // --- App User (dashboard login account) Methods ---

  public getAppUsers(): AppUser[] {
    return this.data.appUsers;
  }

  public getAppUserByUsername(username: string): AppUser | null {
    return this.data.appUsers.find(u => u.username === username) || null;
  }

  public getAppUserById(id: string): AppUser | null {
    return this.data.appUsers.find(u => u.id === id) || null;
  }

  public addAppUser(user: Omit<AppUser, 'id' | 'createdAt' | 'updatedAt'>): AppUser {
    const now = new Date().toISOString();
    const newUser: AppUser = {
      ...user,
      id: `au-${Date.now()}`,
      createdAt: now,
      updatedAt: now
    };
    this.data.appUsers.push(newUser);
    this.saveData(this.data);
    return newUser;
  }

  public updateAppUser(id: string, updates: Partial<AppUser>): AppUser | null {
    const index = this.data.appUsers.findIndex(u => u.id === id);
    if (index === -1) return null;

    const updated: AppUser = {
      ...this.data.appUsers[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.data.appUsers[index] = updated;
    this.saveData(this.data);
    return updated;
  }

  // --- Audit Log Methods ---
  // Read/written directly via SQL (see migration 003) - not part of the
  // in-memory DatabaseSchema/full-snapshot pattern the other tables use.

  public addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    };
    this.sqlite
      .prepare(`
        INSERT INTO audit_logs (id, userId, username, role, action, targetType, targetId, detail, timestamp)
        VALUES (@id, @userId, @username, @role, @action, @targetType, @targetId, @detail, @timestamp)
      `)
      .run({
        ...newEntry,
        targetId: newEntry.targetId ?? null,
        detail: newEntry.detail ?? null
      });
    return newEntry;
  }

  public getAuditLogs(
    filters: { userId?: string; action?: string; targetType?: string; from?: string; to?: string } = {},
    offset = 0,
    limit = 100
  ): { logs: AuditLogEntry[]; total: number } {
    const conditions: string[] = [];
    const params: Record<string, string> = {};

    if (filters.userId) {
      conditions.push('userId = @userId');
      params.userId = filters.userId;
    }
    if (filters.action) {
      conditions.push('action = @action');
      params.action = filters.action;
    }
    if (filters.targetType) {
      conditions.push('targetType = @targetType');
      params.targetType = filters.targetType;
    }
    if (filters.from) {
      conditions.push('timestamp >= @from');
      params.from = filters.from;
    }
    if (filters.to) {
      conditions.push('timestamp <= @to');
      params.to = filters.to;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const total = (
      this.sqlite.prepare(`SELECT COUNT(*) as c FROM audit_logs ${whereClause}`).get(params) as { c: number }
    ).c;

    const logs = (
      this.sqlite
        .prepare(`SELECT * FROM audit_logs ${whereClause} ORDER BY timestamp DESC LIMIT @limit OFFSET @offset`)
        .all({ ...params, limit, offset }) as any[]
    ).map(rowToAuditLog);

    return { logs, total };
  }
}

export const db = new Database();
