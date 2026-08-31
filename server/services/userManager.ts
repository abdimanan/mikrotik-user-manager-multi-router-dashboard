import { RouterRecord, UserManagerUser, UserManagerSession, VoucherBatch, GlobalReportItem } from '../types.js';
import { connectionManager } from './connectionManager.js';
import { db } from '../db.js';

// Decimal (1000-based) units, matching how ISPs (e.g. Starlink) report usage -
// not binary/1024-based, which would under-report against an ISP's own meter
// by ~7% and mislabel GiB as "GB".
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1000;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatBitsPerSecond(bps: number): string {
  if (bps >= 1_000_000) return parseFloat((bps / 1_000_000).toFixed(1)) + 'M';
  if (bps >= 1_000) return parseFloat((bps / 1_000).toFixed(1)) + 'k';
  return `${bps}`;
}

// RouterOS reports queue max-limit / limitation rate as "rx-bps/tx-bps" (e.g. "1000000/2000000")
function formatRateLimit(rawMaxLimit: string): string {
  const [rx, tx] = rawMaxLimit.split('/').map((v) => parseInt(v, 10) || 0);
  return `${formatBitsPerSecond(rx)}/${formatBitsPerSecond(tx)}`;
}

// RouterOS timestamps look like "2026-08-30 08:28:53" in the router's local
// clock - treat it the same way when diffing against "now".
function parseRouterOsTimestamp(value: string): number | null {
  const ms = new Date(value.replace(' ', 'T')).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (days || hours) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(' ');
}

// /user-manager/session's own "uptime" attribute only advances when RADIUS
// sends an interim-accounting update, which can be minutes behind - so a
// session that has genuinely been open for hours can still read "0s". Derive
// the real elapsed time from "started" instead, and only fall back to the
// router's own uptime figure if "started" can't be parsed.
function computeLiveUptimeSeconds(attrs: Record<string, string>): number | null {
  const started = attrs['started'];
  if (!started) return null;
  const startedMs = parseRouterOsTimestamp(started);
  if (startedMs === null) return null;
  return Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
}

function computeLiveUptime(attrs: Record<string, string>): string {
  const liveSeconds = computeLiveUptimeSeconds(attrs);
  if (liveSeconds !== null) return formatDuration(liveSeconds);
  return attrs['uptime'] || '0s';
}

// Parses RouterOS's own duration format ("13h33m35s", "31m40s", "9s", "2d5h") into seconds.
function parseRouterOsDuration(value: string): number {
  const match = value.match(/(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
  if (!match) return 0;
  const [, d, h, m, s] = match;
  return (
    parseInt(d || '0', 10) * 86400 +
    parseInt(h || '0', 10) * 3600 +
    parseInt(m || '0', 10) * 60 +
    parseInt(s || '0', 10)
  );
}

// A finished session's own "uptime" is its accurate final duration; a still-open
// one needs the live elapsed-time calculation instead.
function sessionDurationSeconds(attrs: Record<string, string>): number {
  if (attrs['active'] === 'true') {
    return computeLiveUptimeSeconds(attrs) ?? parseRouterOsDuration(attrs['uptime'] || '0s');
  }
  return parseRouterOsDuration(attrs['uptime'] || '0s');
}

// A still-open session's own download/upload counters lag behind reality
// (same RADIUS interim-accounting delay as uptime) - prefer the live byte
// counter from that user's dynamic hotspot queue when one is available.
function sessionBytes(
  attrs: Record<string, string>,
  trafficByIp: Map<string, { down: number; up: number }>
): { down: number; up: number } {
  if (attrs['active'] === 'true') {
    const live = trafficByIp.get(attrs['user-address']);
    if (live) return live;
  }
  return {
    down: parseInt(attrs['download'] || '0', 10),
    up: parseInt(attrs['upload'] || '0', 10)
  };
}

// A limitation's data quota can reset periodically (RouterOS:
// "monthly"/"weekly"/"daily", or "disabled" for a lifetime cap). Work out
// when the *current* billing period began so usage-against-quota isn't
// polluted by sessions from a previous cycle.
function computeQuotaPeriodStart(resetStartTime: string, resetInterval: string): number | null {
  if (!resetStartTime || !resetInterval || resetInterval === 'disabled') return null;
  const nextResetMs = parseRouterOsTimestamp(resetStartTime);
  if (nextResetMs === null) return null;
  const d = new Date(nextResetMs);
  switch (resetInterval) {
    case 'monthly':
      d.setMonth(d.getMonth() - 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() - 7);
      break;
    case 'daily':
      d.setDate(d.getDate() - 1);
      break;
    default:
      return null;
  }
  return d.getTime();
}

export class UserManagerService {
  /**
   * Fetch live users from a specific MikroTik router via API
   * Dynamically handles RouterOS v7 and v6 API field names
   */
  public async getRouterUsers(router: RouterRecord): Promise<{
    users: UserManagerUser[];
    activeCount: number;
    expiredCount: number;
    totalCount: number;
    simulated: boolean;
  }> {
    const res = await connectionManager.execute(router, async (client) => {
      // Try v7 first
      try {
        const sentences = await client.writeSentence(['/user-manager/user/print']);
        const reItems = sentences.filter((s) => s.type === '!re');
        if (reItems.length > 0) {
          // The user object itself (RouterOS v7 User Manager) only carries
          // identity/auth fields (name, group, disabled, shared-users) - no
          // usage, uptime, IP/MAC or billing profile. Those live in separate
          // tables and have to be joined in by username.
          const profileSentences = await client.writeSentence(['/user-manager/user-profile/print']);
          const profileByUser = new Map<string, { profile: string; state: string }>();
          for (const p of profileSentences.filter((s) => s.type === '!re')) {
            const username = p.attributes['user'];
            if (!username) continue;
            const existing = profileByUser.get(username);
            // A user can accumulate multiple profile assignments over time;
            // prefer the currently-active one, otherwise keep the first seen.
            if (!existing || p.attributes['state'] === 'running-active') {
              profileByUser.set(username, {
                profile: p.attributes['profile'] || 'default',
                state: p.attributes['state'] || ''
              });
            }
          }

          const sessionSentences = await client.writeSentence(['/user-manager/session/print']);
          const sessionsByUser = new Map<string, Record<string, string>[]>();
          for (const s of sessionSentences.filter((s) => s.type === '!re')) {
            const username = s.attributes['user'];
            if (!username) continue;
            const list = sessionsByUser.get(username) || [];
            list.push(s.attributes);
            sessionsByUser.set(username, list);
          }

          // Data quota lives on the profile's limitation, not the user or
          // session: profile (already fetched above) -> limitation name
          // (profile-limitation) -> transfer-limit + reset schedule (limitation).
          const limitationNameByProfile = new Map<string, string>();
          try {
            const profileLimitSentences = await client.writeSentence(['/user-manager/profile-limitation/print']);
            for (const pl of profileLimitSentences.filter((s) => s.type === '!re')) {
              if (pl.attributes['profile'] && pl.attributes['limitation']) {
                limitationNameByProfile.set(pl.attributes['profile'], pl.attributes['limitation']);
              }
            }
          } catch (profileLimitErr) {
            // Leave quota fields blank rather than guessing.
          }

          const limitationByName = new Map<
            string,
            { transferLimitBytes: number; resetStartTime: string; resetInterval: string }
          >();
          try {
            const limitationSentences = await client.writeSentence(['/user-manager/limitation/print']);
            for (const l of limitationSentences.filter((s) => s.type === '!re')) {
              if (!l.attributes['name']) continue;
              limitationByName.set(l.attributes['name'], {
                transferLimitBytes: parseInt(l.attributes['transfer-limit'] || '0', 10),
                resetStartTime: l.attributes['reset-counters-start-time'] || '',
                resetInterval: l.attributes['reset-counters-interval'] || ''
              });
            }
          } catch (limitationErr) {
            // Leave quota fields blank rather than guessing.
          }

          // Same staleness fix as sessions/reports: a still-open session's own
          // download/upload lags RADIUS interim-accounting, so prefer the
          // dynamic hotspot queue's live byte counter where one exists.
          const trafficByIp = new Map<string, { down: number; up: number }>();
          try {
            const queueSentences = await client.writeSentence(['/queue/simple/print']);
            for (const q of queueSentences.filter((s) => s.type === '!re')) {
              const ip = q.attributes['target']?.split('/')[0];
              const bytes = q.attributes['bytes'];
              if (ip && bytes) {
                const [down, up] = bytes.split('/').map((v) => parseInt(v, 10) || 0);
                trafficByIp.set(ip, { down, up });
              }
            }
          } catch (queueErr) {
            // Fall back to each session's own (possibly lagging) counters.
          }

          return reItems.map((r, idx) => {
            const username = r.attributes['name'] || r.attributes['username'] || `user_${idx}`;
            const disabled = r.attributes['disabled'] === 'true' || r.attributes['disabled'] === 'yes';
            const profileInfo = profileByUser.get(username);
            const sessions = sessionsByUser.get(username) || [];

            const sessionByteTotals = sessions.map((s) => sessionBytes(s, trafficByIp));
            const downloadBytes = sessionByteTotals.reduce((sum, b) => sum + b.down, 0);
            const uploadBytes = sessionByteTotals.reduce((sum, b) => sum + b.up, 0);

            // Prefer the live session for uptime/IP/MAC; fall back to the
            // most recently ended session; otherwise the user never connected.
            const activeSession = sessions.find((s) => s['active'] === 'true');
            const latestSession = activeSession || sessions[sessions.length - 1];

            let status: UserManagerUser['status'] = 'active';
            if (disabled) {
              status = 'disabled';
            } else if (profileInfo?.state && /expired|after-time/i.test(profileInfo.state)) {
              status = 'expired';
            }

            // Data quota: how much of the current billing period's cap has
            // been used, and how much is left.
            const limitationName = profileInfo?.profile ? limitationNameByProfile.get(profileInfo.profile) : undefined;
            const limitation = limitationName ? limitationByName.get(limitationName) : undefined;

            let periodUsedBytes = downloadBytes + uploadBytes;
            let quotaResetsAt: string | undefined;
            let quotaResetInterval: string | undefined;
            if (limitation) {
              quotaResetsAt = limitation.resetStartTime || undefined;
              quotaResetInterval = limitation.resetInterval || undefined;
              const periodStart = computeQuotaPeriodStart(limitation.resetStartTime, limitation.resetInterval);
              if (periodStart !== null) {
                periodUsedBytes = sessions.reduce((sum, s) => {
                  const startedMs = s['started'] ? parseRouterOsTimestamp(s['started']) : null;
                  if (startedMs === null || startedMs < periodStart) return sum;
                  const b = sessionBytes(s, trafficByIp);
                  return sum + b.down + b.up;
                }, 0);
              }
            }

            const dataLimitBytes = limitation?.transferLimitBytes || 0;
            const dataRemainingBytes = dataLimitBytes > 0 ? Math.max(0, dataLimitBytes - periodUsedBytes) : null;
            const percentUsed = dataLimitBytes > 0 ? Math.min(100, (periodUsedBytes / dataLimitBytes) * 100) : null;

            return {
              id: r.attributes['.id'] || `u-${idx}`,
              routerId: router.id,
              username,
              profile: profileInfo?.profile || r.attributes['group'] || 'default',
              group: r.attributes['group'] || 'default',
              status,
              uptime: activeSession ? computeLiveUptime(activeSession) : (latestSession?.['uptime'] || '0s'),
              downloadBytes,
              uploadBytes,
              downloadFormatted: formatBytes(downloadBytes),
              uploadFormatted: formatBytes(uploadBytes),
              createdAt: '',
              ipAddress: latestSession?.['user-address'] || latestSession?.['nas-ip-address'] || '',
              macAddress: latestSession?.['calling-station-id'] || '',
              comment: r.attributes['comment'] || '',
              dataLimitBytes: dataLimitBytes || undefined,
              dataLimitFormatted: dataLimitBytes > 0 ? formatBytes(dataLimitBytes) : undefined,
              periodUsedBytes,
              periodUsedFormatted: formatBytes(periodUsedBytes),
              dataRemainingBytes: dataRemainingBytes ?? undefined,
              dataRemainingFormatted: dataLimitBytes > 0 ? formatBytes(dataRemainingBytes || 0) : 'Unlimited',
              percentUsed: percentUsed ?? undefined,
              quotaResetsAt,
              quotaResetInterval
            } as UserManagerUser;
          });
        }
      } catch (v7Err) {
        // Try v6 tool user-manager
        try {
          const v6Sentences = await client.writeSentence(['/tool/user-manager/user/print']);
          const reV6 = v6Sentences.filter((s) => s.type === '!re');
          return reV6.map((r, idx) => {
            const dl = parseInt(r.attributes['download-used'] || '0', 10);
            const ul = parseInt(r.attributes['upload-used'] || '0', 10);
            const disabled = r.attributes['disabled'] === 'true' || r.attributes['disabled'] === 'yes';
            return {
              id: r.attributes['.id'] || `u-${idx}`,
              routerId: router.id,
              username: r.attributes['username'] || `user_${idx}`,
              profile: r.attributes['actual-profile'] || 'default',
              status: disabled ? 'disabled' : 'active',
              uptime: r.attributes['uptime-used'] || '0s',
              downloadBytes: dl,
              uploadBytes: ul,
              downloadFormatted: formatBytes(dl),
              uploadFormatted: formatBytes(ul),
              createdAt: new Date().toISOString().split('T')[0],
              comment: r.attributes['comment'] || ''
            } as UserManagerUser;
          });
        } catch (v6Err) {
          throw new Error('User Manager package is not installed or enabled on this RouterOS device.');
        }
      }
      return [];
    });

    if (res.success && res.data && res.data.length > 0) {
      const users = res.data;
      const activeCount = users.filter((u) => u.status === 'active').length;
      const expiredCount = users.filter((u) => u.status === 'expired').length;
      return {
        users,
        activeCount,
        expiredCount,
        totalCount: users.length,
        simulated: false
      };
    }

    // Return stored/simulated users from DB
    const dbUsers = db.getUsers(router.id);
    const activeCount = dbUsers.filter((u) => u.status === 'active').length;
    const expiredCount = dbUsers.filter((u) => u.status === 'expired').length;

    return {
      users: dbUsers,
      activeCount,
      expiredCount,
      totalCount: dbUsers.length,
      simulated: true
    };
  }

  /**
   * Fetch active sessions
   */
  public async getRouterSessions(router: RouterRecord): Promise<{
    sessions: UserManagerSession[];
    simulated: boolean;
  }> {
    const res = await connectionManager.execute(router, async (client) => {
      try {
        const sentences = await client.writeSentence(['/user-manager/session/print']);
        // /user-manager/session/print returns the full historical session
        // log, not just live connections - RouterOS marks the ones that are
        // actually still open with active=true. Everything else already
        // ended (see its "started"/"ended" pair), so it must be filtered
        // out here or every past session would look "active" in the UI.
        const reItems = sentences.filter((s) => s.type === '!re' && s.attributes['active'] === 'true');

        // Rate limit is a property of the user's billing profile, not the
        // session: user -> assigned profile (user-profile) -> limitation
        // name (profile-limitation) -> actual rx/tx caps (limitation).
        const profileByUser = new Map<string, string>();
        try {
          const profileSentences = await client.writeSentence(['/user-manager/user-profile/print']);
          for (const p of profileSentences.filter((s) => s.type === '!re')) {
            const username = p.attributes['user'];
            if (!username) continue;
            if (!profileByUser.has(username) || p.attributes['state'] === 'running-active') {
              profileByUser.set(username, p.attributes['profile'] || '');
            }
          }
        } catch (profileErr) {
          // Leave rate limits blank rather than guessing.
        }

        const limitationNameByProfile = new Map<string, string>();
        try {
          const profileLimitSentences = await client.writeSentence(['/user-manager/profile-limitation/print']);
          for (const pl of profileLimitSentences.filter((s) => s.type === '!re')) {
            if (pl.attributes['profile'] && pl.attributes['limitation']) {
              limitationNameByProfile.set(pl.attributes['profile'], pl.attributes['limitation']);
            }
          }
        } catch (profileLimitErr) {
          // Leave rate limits blank rather than guessing.
        }

        const rateLimitByLimitationName = new Map<string, string>();
        try {
          const limitationSentences = await client.writeSentence(['/user-manager/limitation/print']);
          for (const l of limitationSentences.filter((s) => s.type === '!re')) {
            const rx = parseInt(l.attributes['rate-limit-rx'] || '0', 10);
            const tx = parseInt(l.attributes['rate-limit-tx'] || '0', 10);
            // Many limitation profiles only cap total data, not throughput -
            // rx=tx=0 means "no rate limit configured", not "0bps".
            if ((rx || tx) && l.attributes['name']) {
              rateLimitByLimitationName.set(l.attributes['name'], `${rx}/${tx}`);
            }
          }
        } catch (limitationErr) {
          // Leave rate limits blank rather than guessing.
        }

        // user-manager's own download/upload counters only advance on RADIUS
        // interim-accounting updates (can lag well behind reality), but the
        // dynamic hotspot queue RouterOS creates per active client keeps a
        // live running byte counter - prefer that when it's available.
        const trafficByIp = new Map<string, { down: number; up: number }>();
        try {
          const queueSentences = await client.writeSentence(['/queue/simple/print']);
          for (const q of queueSentences.filter((s) => s.type === '!re')) {
            const ip = q.attributes['target']?.split('/')[0];
            const bytes = q.attributes['bytes'];
            if (ip && bytes) {
              const [down, up] = bytes.split('/').map((v) => parseInt(v, 10) || 0);
              trafficByIp.set(ip, { down, up });
            }
          }
        } catch (queueErr) {
          // Fall back to the session's own (possibly lagging) counters.
        }

        return reItems.map((r, idx) => {
          const username = r.attributes['user'] || 'user';
          const ip = r.attributes['user-address'] || '';

          const liveTraffic = trafficByIp.get(ip);
          const downloadBytes = liveTraffic?.down ?? parseInt(r.attributes['download'] || '0', 10);
          const uploadBytes = liveTraffic?.up ?? parseInt(r.attributes['upload'] || '0', 10);

          const profile = profileByUser.get(username);
          const limitationName = profile ? limitationNameByProfile.get(profile) : undefined;
          const rawRate = limitationName ? rateLimitByLimitationName.get(limitationName) : undefined;

          return {
            id: r.attributes['.id'] || `sess-${idx}`,
            routerId: router.id,
            routerName: router.name,
            username,
            ipAddress: ip,
            macAddress: r.attributes['calling-station-id'] || '',
            startTime: r.attributes['started'] || '',
            uptime: computeLiveUptime(r.attributes),
            downloadBytes,
            uploadBytes,
            downloadFormatted: formatBytes(downloadBytes),
            uploadFormatted: formatBytes(uploadBytes),
            rateLimit: rawRate ? formatRateLimit(rawRate) : undefined,
            status: 'active'
          } as UserManagerSession;
        });
      } catch (err) {
        return [];
      }
    });

    if (res.success && res.data) {
      return { sessions: res.data, simulated: false };
    }

    return {
      sessions: db.getSessions(router.id),
      simulated: true
    };
  }

  /**
   * Build daily per-user usage reports from the router's full session
   * history (RouterOS doesn't keep pre-aggregated daily reports itself, so
   * this groups /user-manager/session/print records by username + calendar
   * day of "started"). Pass `date` (YYYY-MM-DD) to filter to a single day.
   */
  public async getRouterReports(
    router: RouterRecord,
    date?: string
  ): Promise<{ reports: GlobalReportItem[]; simulated: boolean }> {
    const res = await connectionManager.execute(router, async (client) => {
      const sentences = await client.writeSentence(['/user-manager/session/print']);
      const sessions = sentences.filter((s) => s.type === '!re').map((s) => s.attributes);

      // Same staleness issue as live sessions: a still-open session's own
      // download/upload counters lag behind the router's real-time queue
      // byte counter, so prefer that for whichever session is active.
      const trafficByIp = new Map<string, { down: number; up: number }>();
      try {
        const queueSentences = await client.writeSentence(['/queue/simple/print']);
        for (const q of queueSentences.filter((s) => s.type === '!re')) {
          const ip = q.attributes['target']?.split('/')[0];
          const bytes = q.attributes['bytes'];
          if (ip && bytes) {
            const [down, up] = bytes.split('/').map((v) => parseInt(v, 10) || 0);
            trafficByIp.set(ip, { down, up });
          }
        }
      } catch (queueErr) {
        // Fall back to each session's own (possibly lagging) counters.
      }

      // RouterOS's local permission group (e.g. "default") for each username.
      const groupByUsername = new Map<string, string>();
      try {
        const userSentences = await client.writeSentence(['/user-manager/user/print']);
        for (const u of userSentences.filter((s) => s.type === '!re')) {
          if (u.attributes['name']) {
            groupByUsername.set(u.attributes['name'], u.attributes['group'] || 'default');
          }
        }
      } catch (userErr) {
        // Leave group blank rather than guessing.
      }

      // A user with any currently-open session is "active" right now,
      // regardless of which day's row this is.
      const activeUsernames = new Set(sessions.filter((s) => s['active'] === 'true').map((s) => s['user']));

      interface Group {
        username: string;
        date: string;
        downloadBytes: number;
        uploadBytes: number;
        durationSec: number;
        sessionCount: number;
      }
      const groups = new Map<string, Group>();

      for (const s of sessions) {
        const username = s['user'];
        const started = s['started'];
        if (!username || !started) continue;

        const day = started.split(' ')[0];
        if (date && day !== date) continue;

        const key = `${username}|${day}`;
        const existing = groups.get(key) || {
          username,
          date: day,
          downloadBytes: 0,
          uploadBytes: 0,
          durationSec: 0,
          sessionCount: 0
        };
        const liveTraffic = s['active'] === 'true' ? trafficByIp.get(s['user-address']) : undefined;
        existing.downloadBytes += liveTraffic?.down ?? parseInt(s['download'] || '0', 10);
        existing.uploadBytes += liveTraffic?.up ?? parseInt(s['upload'] || '0', 10);
        existing.durationSec += sessionDurationSeconds(s);
        existing.sessionCount += 1;
        groups.set(key, existing);
      }

      return Array.from(groups.values())
        .sort((a, b) => b.date.localeCompare(a.date) || a.username.localeCompare(b.username))
        .map((g, idx): GlobalReportItem => {
          const totalBytes = g.downloadBytes + g.uploadBytes;
          return {
            id: `rep-${router.id}-${g.username}-${g.date}-${idx}`,
            routerId: router.id,
            routerName: router.name,
            publicIp: router.publicIp,
            date: g.date,
            username: g.username,
            group: groupByUsername.get(g.username) || 'default',
            active: activeUsernames.has(g.username) ? 1 : 0,
            uptime: formatDuration(g.durationSec),
            downloadBytes: g.downloadBytes,
            uploadBytes: g.uploadBytes,
            downloadFormatted: formatBytes(g.downloadBytes),
            uploadFormatted: formatBytes(g.uploadBytes),
            totalBandwidthFormatted: formatBytes(totalBytes),
            sessionCount: g.sessionCount
          };
        });
    });

    if (res.success && res.data) {
      return { reports: res.data, simulated: false };
    }

    let dbReports = db.getReports(router.id);
    if (date) {
      dbReports = dbReports.filter((r) => r.date === date);
    }
    return { reports: dbReports, simulated: true };
  }

  /**
   * Generate a batch of vouchers
   */
  public generateVoucherBatch(params: {
    routerId: string;
    batchName: string;
    profile: string;
    quantity: number;
    codeLength: number;
    prefix: string;
    price: number;
    timeLimit: string;
    dataLimitMb: number;
  }): VoucherBatch {
    const vouchers = [];
    const characters = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

    for (let i = 0; i < params.quantity; i++) {
      let code = params.prefix || '';
      const needed = Math.max(4, params.codeLength - code.length);
      for (let j = 0; j < needed; j++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      const pin = `${Math.floor(1000 + Math.random() * 9000)}`;
      vouchers.push({
        code,
        pin,
        profile: params.profile,
        used: false,
        price: params.price,
        timeLimit: params.timeLimit,
        dataLimitFormatted: params.dataLimitMb >= 1024 ? `${(params.dataLimitMb / 1024).toFixed(1)} GB` : `${params.dataLimitMb} MB`
      });
    }

    const batch = db.addVoucherBatch({
      routerId: params.routerId,
      batchName: params.batchName,
      profile: params.profile,
      quantity: params.quantity,
      codeLength: params.codeLength,
      prefix: params.prefix,
      price: params.price,
      timeLimit: params.timeLimit,
      dataLimitMb: params.dataLimitMb,
      vouchers
    });

    // Also add to router users as inactive/voucher users
    vouchers.slice(0, 10).forEach((v) => {
      db.addUser({
        routerId: params.routerId,
        username: v.code,
        password: v.pin,
        profile: params.profile,
        status: 'pending',
        uptime: '0s',
        downloadBytes: 0,
        uploadBytes: 0,
        downloadFormatted: '0 B',
        uploadFormatted: '0 B',
        createdAt: new Date().toISOString().split('T')[0],
        price: v.price,
        comment: `Batch: ${params.batchName}`
      });
    });

    return batch;
  }
}

export const userManagerService = new UserManagerService();
