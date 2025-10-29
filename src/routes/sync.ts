import { Router, Request, Response } from 'express';
import { SyncService } from '../services/syncService';
import { TaskService } from '../services/taskService';
import { Database } from '../db/database';

export function createSyncRouter(db: Database): Router {
  const router = Router();
  const taskService = new TaskService(db);
  const syncService = new SyncService(db, taskService);

  router.post('/sync', async (req: Request, res: Response) => {
    try {
      const result = await syncService.sync();
      res.json({ message: 'Sync successful', result });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Sync failed' });
    }
  });

  router.get('/health', async (req: Request, res: Response) => {
    res.json({ serverOnline: true, timestamp: new Date().toISOString() });
  });

  return router;
}
