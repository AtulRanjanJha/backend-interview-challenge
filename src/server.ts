import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { Database } from './db/database';

import { createTaskRouter } from './routes/tasks';
import { createSyncRouter } from './routes/sync';

import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const db = new Database(process.env.DATABASE_URL || './data/tasks.sqlite3');

app.use('/api/tasks', createTaskRouter(db));
app.use('/api', createSyncRouter(db));

app.use(errorHandler);

async function start() {
  try {
    await db.initialize();
    console.log('Database initialized');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await db.close();
  process.exit(0);
});
