import express, { Request, Response } from 'express';
import { db } from '../db.js';
import { requireRole } from '../auth/authMiddleware.js';

export const logsRouter = express.Router();

// Super-admin only - this is exactly the "see all actions of all users" view.
logsRouter.use(requireRole('super-admin'));

logsRouter.get('/', (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 200);
    const offset = (page - 1) * limit;

    const { logs, total } = db.getAuditLogs(
      {
        userId: typeof req.query.userId === 'string' ? req.query.userId : undefined,
        action: typeof req.query.action === 'string' ? req.query.action : undefined,
        targetType: typeof req.query.targetType === 'string' ? req.query.targetType : undefined,
        from: typeof req.query.from === 'string' ? req.query.from : undefined,
        to: typeof req.query.to === 'string' ? req.query.to : undefined
      },
      offset,
      limit
    );

    res.json({
      success: true,
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
