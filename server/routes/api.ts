import express, { Request, Response } from 'express';
import { db } from '../db.js';
import { encryptPassword } from '../crypto.js';
import { connectionManager } from '../services/connectionManager.js';
import { userManagerService } from '../services/userManager.js';
import { generateProjectZip } from '../services/zipExporter.js';

export const apiRouter = express.Router();

// Health check
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'MikroTik User Manager Multi-Router Core'
  });
});

// Global Dashboard Statistics
apiRouter.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = db.getGlobalStats();
    res.json({ success: true, stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Router List with Search, Status Filtering, and Pagination (Designed for 1000+ routers)
apiRouter.get('/routers', (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    const status = req.query.status as string;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '12', 10);
    const offset = (page - 1) * limit;

    const result = db.getRouters(search, status, offset, limit);

    res.json({
      success: true,
      routers: result.routers,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      },
      counts: {
        total: result.total,
        online: result.onlineCount,
        offline: result.offlineCount,
        warning: result.warningCount
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test Connection (Stand-alone probe before saving)
apiRouter.post('/routers/test-connection', async (req: Request, res: Response) => {
  try {
    const { publicIp, host, apiPort, connectionType, username, password } = req.body;
    const targetHost = publicIp || host;
    if (!targetHost) {
      return res.status(400).json({ success: false, message: 'Public IP or Host is required.' });
    }

    const port = parseInt(apiPort || (connectionType === 'api-ssl' ? '8729' : '8728'), 10);
    const useSsl = connectionType === 'api-ssl' || port === 8729;

    const testResult = await connectionManager.testConnection({
      host: targetHost,
      port,
      useSsl,
      username: username || 'admin',
      password: password || ''
    });

    res.json(testResult);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Connection test failed unexpectedly'
    });
  }
});

// Add Router
apiRouter.post('/routers', async (req: Request, res: Response) => {
  try {
    const { name, publicIp, apiPort, connectionType, username, password, location } = req.body;

    if (!name || !publicIp || !username) {
      return res.status(400).json({
        success: false,
        message: 'Name, Public IP, and Username are required.'
      });
    }

    const port = parseInt(apiPort || (connectionType === 'api-ssl' ? '8729' : '8728'), 10);
    const connType = connectionType || (port === 8729 ? 'api-ssl' : 'api');

    // Securely encrypt password with AES-256-GCM
    const enc = encryptPassword(password || '');

    let newRouter = db.addRouter({
      name,
      publicIp,
      apiPort: port,
      connectionType: connType,
      username,
      encryptedPassword: enc.encrypted,
      passwordIv: enc.iv,
      passwordTag: enc.tag,
      status: 'connecting',
      lastSeen: 'Just now',
      location: location || 'General Network'
    });

    // Pull real telemetry immediately so the record reflects the actual
    // router from the moment it's added, instead of placeholder numbers.
    const fullRouter = db.getRouterById(newRouter.id, true);
    if (fullRouter) {
      const stats = await connectionManager.getSystemStats(fullRouter);
      const updated = stats.success
        ? db.updateRouter(newRouter.id, {
            status: 'online',
            cpuLoad: stats.cpuLoad,
            memoryUsedMb: stats.memoryUsedMb,
            memoryTotalMb: stats.memoryTotalMb,
            uptime: stats.uptime,
            routerOsVersion: stats.routerOsVersion,
            architecture: stats.architecture,
            lastSeen: 'Just now'
          })
        : db.updateRouter(newRouter.id, {
            status: 'offline',
            lastError: stats.error || 'Unable to reach router at creation time.'
          });
      if (updated) newRouter = updated;
    }

    // Add alert
    db.addAlert({
      routerId: newRouter.id,
      routerName: newRouter.name,
      publicIp: newRouter.publicIp,
      title: `Router Added: ${newRouter.name}`,
      description: `Successfully provisioned ${newRouter.name} (${newRouter.publicIp}) using ${newRouter.connectionType.toUpperCase()}:${newRouter.apiPort}.`,
      severity: 'info'
    });

    res.status(201).json({ success: true, router: newRouter });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Seed bulk routers for 1000+ benchmark testing
apiRouter.post('/routers/seed-bulk', (req: Request, res: Response) => {
  try {
    const count = parseInt(req.body.count || '100', 10);
    const total = db.seedBulkRouters(count);
    res.json({ success: true, count, totalRouters: total });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Single Router Details
apiRouter.get('/routers/:id', (req: Request, res: Response) => {
  try {
    const router = db.getRouterById(req.params.id);
    if (!router) {
      return res.status(404).json({ success: false, message: 'Router not found' });
    }
    res.json({ success: true, router });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Router
apiRouter.put('/routers/:id', (req: Request, res: Response) => {
  try {
    const { name, publicIp, apiPort, connectionType, username, password, location, status } = req.body;
    const updates: any = {};

    if (name) updates.name = name;
    if (publicIp) updates.publicIp = publicIp;
    if (apiPort) updates.apiPort = parseInt(apiPort, 10);
    if (connectionType) updates.connectionType = connectionType;
    if (username) updates.username = username;
    if (location !== undefined) updates.location = location;
    if (status) updates.status = status;

    if (password) {
      const enc = encryptPassword(password);
      updates.encryptedPassword = enc.encrypted;
      updates.passwordIv = enc.iv;
      updates.passwordTag = enc.tag;
    }

    const updated = db.updateRouter(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Router not found' });
    }

    res.json({ success: true, router: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete Router
apiRouter.delete('/routers/:id', (req: Request, res: Response) => {
  try {
    const deleted = db.deleteRouter(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Router not found' });
    }
    res.json({ success: true, message: 'Router deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sync Router (Live poll / Refresh)
apiRouter.post('/routers/:id/sync', async (req: Request, res: Response) => {
  try {
    const router = db.getRouterById(req.params.id, true);
    if (!router) {
      return res.status(404).json({ success: false, message: 'Router not found' });
    }

    const stats = await connectionManager.getSystemStats(router);

    if (!stats.success) {
      const updated = db.updateRouter(router.id, {
        status: 'offline',
        lastError: stats.error || 'Connection failed'
      });
      return res.json({
        success: false,
        router: updated,
        error: stats.error || 'Unable to reach router.'
      });
    }

    const updated = db.updateRouter(router.id, {
      cpuLoad: stats.cpuLoad,
      memoryUsedMb: stats.memoryUsedMb,
      memoryTotalMb: stats.memoryTotalMb,
      uptime: stats.uptime,
      routerOsVersion: stats.routerOsVersion,
      architecture: stats.architecture,
      lastSeen: 'Just now',
      lastError: undefined,
      status: 'online'
    });

    res.json({
      success: true,
      router: updated,
      liveStats: {
        downloadMbps: stats.downloadMbps,
        uploadMbps: stats.uploadMbps
      },
      message: `Synchronized telemetry with ${router.name} (${router.publicIp}).`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Router Users
apiRouter.get('/routers/:id/users', async (req: Request, res: Response) => {
  try {
    const router = db.getRouterById(req.params.id, true);
    if (!router) {
      return res.status(404).json({ success: false, message: 'Router not found' });
    }

    const userResult = await userManagerService.getRouterUsers(router);
    res.json({ success: true, ...userResult });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add User to Router
apiRouter.post('/routers/:id/users', (req: Request, res: Response) => {
  try {
    const { username, password, profile, comment, price, ipAddress } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, message: 'Username is required.' });
    }

    const newUser = db.addUser({
      routerId: req.params.id,
      username,
      password: password || '1234',
      profile: profile || 'Standard-20Mbps',
      status: 'active',
      uptime: '0s',
      downloadBytes: 0,
      uploadBytes: 0,
      downloadFormatted: '0 B',
      uploadFormatted: '0 B',
      createdAt: new Date().toISOString().split('T')[0],
      comment: comment || '',
      price: price ? parseFloat(price) : undefined,
      ipAddress: ipAddress || ''
    });

    res.status(201).json({ success: true, user: newUser });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete User
apiRouter.delete('/routers/:id/users/:userId', (req: Request, res: Response) => {
  try {
    const deleted = db.deleteUser(req.params.userId);
    res.json({ success: deleted });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Router Active Sessions
apiRouter.get('/routers/:id/sessions', async (req: Request, res: Response) => {
  try {
    const router = db.getRouterById(req.params.id, true);
    if (!router) {
      return res.status(404).json({ success: false, message: 'Router not found' });
    }

    const sessionResult = await userManagerService.getRouterSessions(router);
    res.json({ success: true, ...sessionResult });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Disconnect / Kill Session
apiRouter.post('/routers/:id/sessions/:sessionId/kill', (req: Request, res: Response) => {
  try {
    const success = db.killSession(req.params.sessionId);
    res.json({
      success,
      message: success ? 'Session terminated on MikroTik router.' : 'Session not found'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Router Vouchers
apiRouter.get('/routers/:id/vouchers', (req: Request, res: Response) => {
  try {
    const vouchers = db.getVouchers(req.params.id);
    res.json({ success: true, vouchers });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate Vouchers Batch
apiRouter.post('/routers/:id/vouchers/generate', (req: Request, res: Response) => {
  try {
    const { batchName, profile, quantity, codeLength, prefix, price, timeLimit, dataLimitMb } = req.body;

    const batch = userManagerService.generateVoucherBatch({
      routerId: req.params.id,
      batchName: batchName || `VoucherBatch-${Date.now()}`,
      profile: profile || 'Guest-1Hour',
      quantity: parseInt(quantity || '20', 10),
      codeLength: parseInt(codeLength || '6', 10),
      prefix: prefix || 'PIN',
      price: parseFloat(price || '2.00'),
      timeLimit: timeLimit || '1h',
      dataLimitMb: parseInt(dataLimitMb || '1024', 10)
    });

    res.status(201).json({ success: true, batch });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Router-Specific Report
apiRouter.get('/routers/:id/reports', async (req: Request, res: Response) => {
  try {
    const router = db.getRouterById(req.params.id, true);
    if (!router) {
      return res.status(404).json({ success: false, message: 'Router not found' });
    }
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const result = await userManagerService.getRouterReports(router, date, true);
    res.json({ success: true, reports: result.reports, simulated: result.simulated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Global Multi-Router Report
apiRouter.get('/reports/global', async (req: Request, res: Response) => {
  try {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const { routers } = db.getRouters(undefined, undefined, 0, 10000);

    const results = await Promise.all(
      routers.map(async (r) => {
        const fullRouter = db.getRouterById(r.id, true);
        if (!fullRouter) return [];
        const result = await userManagerService.getRouterReports(fullRouter, date);
        return result.reports;
      })
    );

    res.json({ success: true, reports: results.flat() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Alerts
apiRouter.get('/alerts', (req: Request, res: Response) => {
  try {
    const alerts = db.getAlerts();
    res.json({ success: true, alerts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Download Project ZIP Deliverable
apiRouter.get('/download/project-zip', async (req: Request, res: Response) => {
  try {
    const zipBuffer = await generateProjectZip();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="MikroTik_MultiRouter_UserManager_NodeJS.zip"'
    );
    res.send(zipBuffer);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
