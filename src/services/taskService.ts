import { v4 as uuidv4 } from 'uuid';
import { Task } from '../types';
import { Database } from '../db/database';

export class TaskService {
  constructor(private db: Database) {}

  async getAllTasks(): Promise<Task[]> {
    // Query all tasks not soft-deleted
    return await this.db.all('SELECT * FROM tasks WHERE is_deleted = 0', []);
  }

  async getTask(id: string): Promise<Task | null> {
    const task = await this.db.get('SELECT * FROM tasks WHERE id = ? AND is_deleted = 0', [id]);
    return task || null;
  }

  async createTask(taskData: Partial<Task>): Promise<Task> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const task: Task = {
      id,
      title: taskData.title!,
      description: taskData.description || '',
      completed: false,
      is_deleted: false,
      created_at: now,
      updated_at: now,
      sync_status: 'pending',
    };

    await this.db.run(
      'INSERT INTO tasks (id, title, description, completed, is_deleted, created_at, updated_at, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [task.id, task.title, task.description, task.completed ? 1 : 0, task.is_deleted ? 1 : 0, task.created_at, task.updated_at, task.sync_status]
    );

    return task;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const existing = await this.getTask(id);
    if (!existing) throw new Error('Task not found');
    const updated: Task = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
      sync_status: 'pending',
    };

    await this.db.run(
      'UPDATE tasks SET title = ?, description = ?, completed = ?, updated_at = ?, sync_status = ? WHERE id = ?',
      [updated.title, updated.description, updated.completed ? 1 : 0, updated.updated_at, updated.sync_status, id]
    );
    return updated;
  }

  async deleteTask(id: string): Promise<void> {
    const existing = await this.getTask(id);
    if (!existing) throw new Error('Task not found');
    const updated_at = new Date().toISOString();
    await this.db.run(
      'UPDATE tasks SET is_deleted = 1, updated_at = ?, sync_status = ? WHERE id = ?',
      [updated_at, 'pending', id]
    );
  }
}
