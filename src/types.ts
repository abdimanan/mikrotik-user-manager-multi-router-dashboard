export type ConnectionType = 'api' | 'api-ssl';

export type RouterStatus = 'online' | 'offline' | 'warning' | 'connecting';

export interface RouterRecord {
  id: string;
  name: string;
  publicIp: string;
  apiPort: number;
  connectionType: ConnectionType;
  username: string;
  status: RouterStatus;
  routerOsVersion?: string;
  architecture?: string;
  cpuLoad?: number;
  memoryUsedMb?: number;
  memoryTotalMb?: number;
  uptime?: string;
  lastSeen?: string;
  lastError?: string;
  createdDate: string;
  updatedDate: string;
  location?: string;
  tags?: string[];
}

export interface GlobalStats {
  totalRouters: string | number;
  totalRoutersRaw: number;
  onlineRouters: string | number;
  onlineRoutersRaw: number;
  offlineRouters: string | number;
  offlineRoutersRaw: number;
  totalUsers: string | number;
  totalUsersRaw: number;
  activeUsers: string | number;
  activeUsersRaw: number;
  expiredUsers: number;
  totalSessions: number;
  recentAlerts: RouterAlert[];
}

export interface UserManagerUser {
  id: string;
  routerId: string;
  username: string;
  password?: string;
  profile: string;
  status: 'active' | 'expired' | 'disabled' | 'pending';
  uptime: string;
  downloadBytes: number;
  uploadBytes: number;
  downloadFormatted: string;
  uploadFormatted: string;
  createdAt: string;
  expiresAt?: string;
  ipAddress?: string;
  macAddress?: string;
  comment?: string;
  price?: number;
}

export interface UserManagerSession {
  id: string;
  routerId: string;
  routerName: string;
  username: string;
  ipAddress: string;
  macAddress: string;
  startTime: string;
  uptime: string;
  downloadBytes: number;
  uploadBytes: number;
  downloadFormatted: string;
  uploadFormatted: string;
  rateLimit?: string;
  status: 'active' | 'closing';
}

export interface VoucherBatch {
  id: string;
  routerId: string;
  batchName: string;
  profile: string;
  quantity: number;
  codeLength: number;
  prefix: string;
  price: number;
  timeLimit: string;
  dataLimitMb: number;
  createdDate: string;
  vouchers: {
    code: string;
    pin: string;
    profile: string;
    used: boolean;
    usedBy?: string;
    usedDate?: string;
    price: number;
    timeLimit: string;
    dataLimitFormatted: string;
  }[];
}

export interface RouterAlert {
  id: string;
  routerId?: string;
  routerName?: string;
  publicIp?: string;
  title: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  timestamp: string;
  timeAgo: string;
  read: boolean;
}

export interface GlobalReportItem {
  id: string;
  routerId: string;
  routerName: string;
  publicIp: string;
  date: string;
  username: string;
  uptime: string;
  downloadBytes: number;
  uploadBytes: number;
  downloadFormatted: string;
  uploadFormatted: string;
  totalBandwidthFormatted: string;
  sessionCount: number;
}

export interface ConnectionTestResult {
  success: boolean;
  latencyMs: number;
  version?: string;
  identity?: string;
  architecture?: string;
  cpuCount?: number;
  message: string;
  details?: string;
}

export type MainTab = 'dashboard' | 'routers' | 'users' | 'sessions' | 'vouchers' | 'reports' | 'settings';
