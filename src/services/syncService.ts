import axios from 'axios';
import { Task, SyncQueueItem, SyncResult, SyncError } from '../types';
import { Database } from '../db/database';
import { TaskService } from './taskService';

export class SyncService {
  private apiUrl: string;

  constructor(
    private db: Database,
    private taskService: TaskService,
    apiUrl?: string
  ) {
    this.apiUrl = apiUrl || process.env.API_BASE_URL || 'http://localhost:3000/api';
  }

  async sync(): Promise<SyncResult> {
    const queue: SyncQueueItem[] = await this.db.all('SELECT * FROM sync_queue ORDER BY created_at ASC');
    const batchSize = parseInt(process.env.SYNC_BATCH_SIZE || '10', 10);
    let synced = 0;
    let failed = 0;
    const errors: SyncError[] = [];

    for (let i = 0; i < queue.length; i += batchSize) {
      const batch = queue.slice(i, i + batchSize);
      try {
        await this.processBatch(batch);
        synced += batch.length;
      } catch (e) {
        failed += batch.length;
        errors.push({
          task_id: '', // batch error, leave blank or add batch label
          operation: 'batch',
          error: e instanceof Error ? e.message : String(e),
          timestamp: new Date().toISOString(),
        });
      }
    }

    return { success: failed === 0, synced_items: synced, failed_items: failed, errors };
  }

  async addToSyncQueue(taskId: string, operation: 'create' | 'update' | 'delete', data: Partial<Task>): Promise<void> {
    const id = crypto.randomUUID();
    const created_at = new Date().toISOString();
    await this.db.run(
      'INSERT INTO sync_queue (id, task_id, operation, data, created_at, retry_count) VALUES (?, ?, ?, ?, ?, ?)',
      [id, taskId, operation, JSON.stringify(data), created_at, 0]
    );
  }

  private async processBatch(items: SyncQueueItem[]): Promise<void> {
    const response = await axios.post(`${this.apiUrl}/tasks/batch`, { items });

    if (response.status !== 200 || !response.data.success) {
      throw new Error('Batch sync failed');
    }

    for (const processed of response.data.processed_items) {
      if (processed.status === 'conflict') {
        const localTask = await this.taskService.getTask(processed.client_id);
        if (!localTask) throw new Error('Local task missing during conflict resolution');
        const resolved = this.resolveConflict(localTask, processed.resolved_data);
        await this.taskService.updateTask(localTask.id, resolved);
      }
      await this.db.run('DELETE FROM sync_queue WHERE id = ?', [processed.client_id]);
    }
  }

  private resolveConflict(localTask: Task, serverTask: Task): Partial<Task> {
    return new Date(localTask.updated_at) > new Date(serverTask.updated_at) ? localTask : serverTask;
  }

  async checkConnectivity(): Promise<boolean> {
    try {
      await axios.head(this.apiUrl);
      return true;
    } catch {
      return false;
    }
  }
}
