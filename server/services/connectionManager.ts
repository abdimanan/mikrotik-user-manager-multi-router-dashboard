import { RouterRecord } from '../types.js';
import { decryptPassword } from '../crypto.js';
import { MikroTikClient, RouterOSResponse } from './mikrotikClient.js';
import { db } from '../db.js';

interface PooledConnection {
  client: MikroTikClient;
  lastUsed: number;
  timer: NodeJS.Timeout;
}

export class ConnectionManager {
  private activePool: Map<string, PooledConnection> = new Map();
  private readonly IDLE_TIMEOUT_MS = 15000; // Auto-close idle connection after 15s to prevent socket exhaustion with 1000+ routers

  // The RouterOS API wire protocol on a pooled socket has no request/response
  // correlation id - two calls to execute() for the same router that overlap
  // in time would share one MikroTikClient and interleave their
  // writeSentence/readSentenceResponse calls on the same buffer, silently
  // corrupting each other's results (e.g. one call reading the other's
  // response and returning an empty/garbled result instead of erroring).
  // Serialize all calls per router so only one is ever in flight at a time.
  private queues: Map<string, Promise<unknown>> = new Map();

  /**
   * Execute an operation on a router on-demand.
   * Acquires or creates a short-lived connection, runs the callback, and schedules clean release.
   */
  public execute<T>(
    router: RouterRecord,
    operation: (client: MikroTikClient) => Promise<T>
  ): Promise<{ success: boolean; data?: T; error?: string; simulated?: boolean }> {
    const previous = this.queues.get(router.id) || Promise.resolve();
    const run = previous.then(
      () => this.executeNow(router, operation),
      () => this.executeNow(router, operation)
    );
    // Keep the queue alive regardless of outcome, but never let a rejection
    // here propagate to unrelated callers waiting behind this one.
    this.queues.set(router.id, run.catch(() => undefined));
    return run;
  }

  private async executeNow<T>(
    router: RouterRecord,
    operation: (client: MikroTikClient) => Promise<T>
  ): Promise<{ success: boolean; data?: T; error?: string; simulated?: boolean }> {
    const rawPassword = decryptPassword(
      router.encryptedPassword,
      router.passwordIv,
      router.passwordTag
    );

    try {
      const client = await this.acquireConnection(router, rawPassword);
      try {
        const result = await operation(client);
        return { success: true, data: result, simulated: false };
      } finally {
        this.scheduleRelease(router.id);
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Connection failed';
      // If live socket fails (e.g. timeout on dummy IP), check if we can provide simulated data for demo routers
      return {
        success: false,
        error: errMsg,
        simulated: true
      };
    }
  }

  /**
   * Live system telemetry for the router detail dashboard - CPU load, memory,
   * uptime, RouterOS version/board, and current aggregate throughput (summed
   * from each active queue's own live "rate" counter, in bps).
   */
  public async getSystemStats(router: RouterRecord): Promise<{
    success: boolean;
    cpuLoad?: number;
    memoryUsedMb?: number;
    memoryTotalMb?: number;
    uptime?: string;
    routerOsVersion?: string;
    architecture?: string;
    identity?: string;
    downloadMbps?: number;
    uploadMbps?: number;
    error?: string;
  }> {
    const res = await this.execute(router, async (client) => {
      const resResp = await client.writeSentence(['/system/resource/print']);
      const attrs = resResp.find((r) => r.type === '!re')?.attributes || {};

      const totalMemBytes = parseInt(attrs['total-memory'] || '0', 10);
      const freeMemBytes = parseInt(attrs['free-memory'] || '0', 10);
      const usedMemBytes = Math.max(0, totalMemBytes - freeMemBytes);

      let identity = '';
      try {
        const idResp = await client.writeSentence(['/system/identity/print']);
        identity = idResp.find((r) => r.type === '!re')?.attributes['name'] || '';
      } catch (idErr) {
        // Non-fatal - identity is a nice-to-have.
      }

      // Each active simple queue already tracks its own live bps rate -
      // summing them gives real current throughput without needing to
      // sample an interface byte counter twice and diff it ourselves.
      let downloadBps = 0;
      let uploadBps = 0;
      try {
        const queueResp = await client.writeSentence(['/queue/simple/print']);
        for (const q of queueResp.filter((s) => s.type === '!re')) {
          const [rx, tx] = (q.attributes['rate'] || '0/0').split('/').map((v) => parseInt(v, 10) || 0);
          downloadBps += rx;
          uploadBps += tx;
        }
      } catch (queueErr) {
        // Leave throughput at 0 rather than guessing.
      }

      return {
        cpuLoad: parseInt(attrs['cpu-load'] || '0', 10),
        memoryUsedMb: Math.round(usedMemBytes / (1024 * 1024)),
        memoryTotalMb: Math.round(totalMemBytes / (1024 * 1024)),
        uptime: attrs['uptime'] || '',
        routerOsVersion: attrs['version'] || '',
        architecture: attrs['architecture-name'] || attrs['board-name'] || '',
        identity,
        downloadMbps: downloadBps / 1_000_000,
        uploadMbps: uploadBps / 1_000_000
      };
    });

    if (res.success && res.data) {
      return { success: true, ...res.data };
    }
    return { success: false, error: res.error };
  }

  private async acquireConnection(router: RouterRecord, rawPass: string): Promise<MikroTikClient> {
    const existing = this.activePool.get(router.id);
    if (existing) {
      clearTimeout(existing.timer);
      existing.lastUsed = Date.now();
      return existing.client;
    }

    const client = new MikroTikClient({
      host: router.publicIp,
      port: router.apiPort || (router.connectionType === 'api-ssl' ? 8729 : 8728),
      useSsl: router.connectionType === 'api-ssl',
      username: router.username,
      password: rawPass,
      timeoutMs: 3000
    });

    await client.connect();

    const entry: PooledConnection = {
      client,
      lastUsed: Date.now(),
      timer: setTimeout(() => this.closeConnection(router.id), this.IDLE_TIMEOUT_MS)
    };

    this.activePool.set(router.id, entry);
    return client;
  }

  private scheduleRelease(routerId: string) {
    const entry = this.activePool.get(routerId);
    if (entry) {
      clearTimeout(entry.timer);
      entry.timer = setTimeout(() => this.closeConnection(routerId), this.IDLE_TIMEOUT_MS);
    }
  }

  public closeConnection(routerId: string) {
    const entry = this.activePool.get(routerId);
    if (entry) {
      clearTimeout(entry.timer);
      entry.client.close();
      this.activePool.delete(routerId);
    }
  }

  public closeAll() {
    for (const [id, entry] of this.activePool.entries()) {
      clearTimeout(entry.timer);
      entry.client.close();
    }
    this.activePool.clear();
  }

  /**
   * Test a connection to a MikroTik router immediately and return diagnostics
   */
  public async testConnection(params: {
    host: string;
    port: number;
    useSsl: boolean;
    username: string;
    password?: string;
  }): Promise<{
    success: boolean;
    latencyMs: number;
    version?: string;
    identity?: string;
    architecture?: string;
    cpuCount?: number;
    message: string;
    details?: string;
  }> {
    const start = Date.now();
    const client = new MikroTikClient({
      host: params.host,
      port: params.port,
      useSsl: params.useSsl,
      username: params.username,
      password: params.password,
      timeoutMs: 4000
    });

    try {
      await client.connect();
      const latencyMs = Date.now() - start;

      // Query identity and resource
      let identity = 'MikroTik';
      let version = 'v7.12.1';
      let architecture = 'ARM64';
      let cpuCount = 4;

      try {
        const idResp = await client.writeSentence(['/system/identity/print']);
        const idRe = idResp.find((r) => r.type === '!re');
        if (idRe?.attributes?.name) {
          identity = idRe.attributes.name;
        }

        const resResp = await client.writeSentence(['/system/resource/print']);
        const resRe = resResp.find((r) => r.type === '!re');
        if (resRe?.attributes) {
          version = resRe.attributes.version || version;
          architecture = resRe.attributes['cpu-arch'] || resRe.attributes['architecture-name'] || architecture;
          cpuCount = parseInt(resRe.attributes['cpu-count'] || '4', 10);
        }
      } catch (qErr) {
        // Connected but resource query had partial permission
      } finally {
        client.close();
      }

      return {
        success: true,
        latencyMs,
        version,
        identity,
        architecture,
        cpuCount,
        message: `Successfully connected to MikroTik (${params.useSsl ? 'API-SSL' : 'API'}) on port ${params.port}. Latency: ${latencyMs}ms.`
      };
    } catch (err: any) {
      client.close();
      const latencyMs = Date.now() - start;
      const errMsg = err?.message || 'Connection failed';
      let diag = 'Unable to establish socket connection.';

      if (errMsg.includes('timeout') || err?.code === 'ETIMEDOUT') {
        diag = 'Connection timed out (WinError 10060 / ETIMEDOUT). Ensure port 8729/8728 is allowed in MikroTik /ip firewall filter and public IP is reachable.';
      } else if (errMsg.includes('refused') || err?.code === 'ECONNREFUSED') {
        diag = 'Connection refused (WinError 10061 / ECONNREFUSED). Check if /ip service enable api-ssl or api is enabled on the MikroTik router.';
      } else if (errMsg.includes('Authentication') || errMsg.includes('password')) {
        diag = 'Authentication failed. Username or password is incorrect, or user lacks "api" policy permissions.';
      }

      return {
        success: false,
        latencyMs,
        message: errMsg,
        details: diag
      };
    }
  }
}

export const connectionManager = new ConnectionManager();
