import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRouter, verifyJwt } from './auth';
import { circlesRouter } from './routes/circles';
import { tasksRouter } from './routes/tasks';
import { errorHandler } from './middleware/error';

const app = express();
const PORT = process.env.PORT ?? 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? '*' }));
app.use(express.json());

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth', authRouter);
app.use('/circles', verifyJwt, circlesRouter);
app.use('/tasks', verifyJwt, tasksRouter);

// ── Error handler (must be last) ──────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});

export default app;
