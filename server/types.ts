export type ConnectionType = 'api' | 'api-ssl';

export type RouterStatus = 'online' | 'offline' | 'warning' | 'connecting';

export interface RouterRecord {
  id: string;
  name: string;
  publicIp: string;
  apiPort: number;
  connectionType: ConnectionType;
  username: string;
  encryptedPassword: string; // AES-256-GCM encrypted
  passwordIv: string;
  passwordTag: string;
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

export interface UserManagerUser {
  id: string;
  routerId: string;
  username: string;
  password?: string;
  profile: string;
  group?: string;
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
  // Data quota (from the user's assigned billing profile's limitation)
  dataLimitBytes?: number;
  dataLimitFormatted?: string;
  periodUsedBytes?: number;
  periodUsedFormatted?: string;
  dataRemainingBytes?: number;
  dataRemainingFormatted?: string;
  percentUsed?: number;
  quotaResetsAt?: string;
  quotaResetInterval?: string;
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
  group?: string;
  active: number; // 1 if the user currently has an open session, 0 otherwise
  uptime: string;
  downloadBytes: number;
  uploadBytes: number;
  downloadFormatted: string;
  uploadFormatted: string;
  totalBandwidthFormatted: string;
  sessionCount: number;
}
