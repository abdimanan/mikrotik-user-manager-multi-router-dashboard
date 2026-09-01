import type { Migration } from '../migrationRunner.js';

// Baseline schema as of the SQLite migration (Phase 1) plus app_users (Phase
// 2) - the full table set every install has today. Future schema changes are
// new numbered migrations, not edits to this file.
export const migration001InitSchema: Migration = {
  id: '001_init_schema',
  up(sqlite) {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS routers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        publicIp TEXT NOT NULL,
        apiPort INTEGER NOT NULL,
        connectionType TEXT NOT NULL,
        username TEXT NOT NULL,
        encryptedPassword TEXT NOT NULL,
        passwordIv TEXT NOT NULL,
        passwordTag TEXT NOT NULL,
        status TEXT NOT NULL,
        routerOsVersion TEXT,
        architecture TEXT,
        cpuLoad INTEGER,
        memoryUsedMb INTEGER,
        memoryTotalMb INTEGER,
        uptime TEXT,
        lastSeen TEXT,
        lastError TEXT,
        createdDate TEXT NOT NULL,
        updatedDate TEXT NOT NULL,
        location TEXT,
        tags TEXT
      );

      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        routerId TEXT,
        routerName TEXT,
        publicIp TEXT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        severity TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        timeAgo TEXT NOT NULL,
        read INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS voucher_batches (
        id TEXT PRIMARY KEY,
        routerId TEXT NOT NULL,
        batchName TEXT NOT NULL,
        profile TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        codeLength INTEGER NOT NULL,
        prefix TEXT NOT NULL,
        price REAL NOT NULL,
        timeLimit TEXT NOT NULL,
        dataLimitMb INTEGER NOT NULL,
        createdDate TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS voucher_codes (
        batchId TEXT NOT NULL,
        idx INTEGER NOT NULL,
        code TEXT NOT NULL,
        pin TEXT NOT NULL,
        profile TEXT NOT NULL,
        used INTEGER NOT NULL DEFAULT 0,
        usedBy TEXT,
        usedDate TEXT,
        price REAL NOT NULL,
        timeLimit TEXT NOT NULL,
        dataLimitFormatted TEXT NOT NULL,
        PRIMARY KEY (batchId, idx)
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        routerId TEXT NOT NULL,
        username TEXT NOT NULL,
        password TEXT,
        profile TEXT NOT NULL,
        "group" TEXT,
        status TEXT NOT NULL,
        uptime TEXT NOT NULL,
        downloadBytes INTEGER NOT NULL,
        uploadBytes INTEGER NOT NULL,
        downloadFormatted TEXT NOT NULL,
        uploadFormatted TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        expiresAt TEXT,
        ipAddress TEXT,
        macAddress TEXT,
        comment TEXT,
        price REAL,
        dataLimitBytes INTEGER,
        dataLimitFormatted TEXT,
        periodUsedBytes INTEGER,
        periodUsedFormatted TEXT,
        dataRemainingBytes INTEGER,
        dataRemainingFormatted TEXT,
        percentUsed REAL,
        quotaResetsAt TEXT,
        quotaResetInterval TEXT
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        routerId TEXT NOT NULL,
        routerName TEXT NOT NULL,
        username TEXT NOT NULL,
        ipAddress TEXT NOT NULL,
        macAddress TEXT NOT NULL,
        startTime TEXT NOT NULL,
        uptime TEXT NOT NULL,
        downloadBytes INTEGER NOT NULL,
        uploadBytes INTEGER NOT NULL,
        downloadFormatted TEXT NOT NULL,
        uploadFormatted TEXT NOT NULL,
        rateLimit TEXT,
        status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        routerId TEXT NOT NULL,
        routerName TEXT NOT NULL,
        publicIp TEXT NOT NULL,
        date TEXT NOT NULL,
        username TEXT NOT NULL,
        "group" TEXT,
        active INTEGER NOT NULL,
        uptime TEXT NOT NULL,
        downloadBytes INTEGER NOT NULL,
        uploadBytes INTEGER NOT NULL,
        downloadFormatted TEXT NOT NULL,
        uploadFormatted TEXT NOT NULL,
        totalBandwidthFormatted TEXT NOT NULL,
        sessionCount INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS app_users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        passwordHash TEXT NOT NULL,
        role TEXT NOT NULL,
        assignedRouterIds TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        lastLoginAt TEXT
      );
    `);
  }
};
