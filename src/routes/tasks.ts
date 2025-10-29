import { Router, Request, Response } from 'express';
import { TaskService } from '../services/taskService';
import { SyncService } from '../services/syncService';
import { Database } from '../db/database';

export function createTaskRouter(db: Database): Router {
  const router = Router();
  const taskService = new TaskService(db);
  const syncService = new SyncService(db, taskService);

  router.get('/', async (req: Request, res: Response) => {
    try {
      const tasks = await taskService.getAllTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const task = await taskService.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch task' });
    }
  });

  router.post('/', async (req: Request, res: Response) => {
    try {
      const { title, description } = req.body;
      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }
      const newTask = await taskService.createTask({ title, description });
      res.status(201).json(newTask);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { title, description, completed } = req.body;
    const { id } = req.params;
    const updatedTask = await taskService.updateTask(id, { title, description, completed });
    res.json(updatedTask);
  } catch (error) {
    if (error instanceof Error && error.message === 'Task not found') {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.status(500).json({ error: 'Failed to update task' });
  }
});


router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await taskService.deleteTask(id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === 'Task not found') {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.status(500).json({ error: 'Failed to delete task' });
  }
});
  


  return router;
}
