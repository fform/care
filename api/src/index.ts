import fs from 'node:fs';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import express from 'express';

/** Package dir (`api/`) — works for both `src/` (tsx) and `dist/` (node). */
const apiDir = path.join(__dirname, '..');
const rootEnv = path.join(apiDir, '..', '.env');
const localEnv = path.join(apiDir, '.env');
if (fs.existsSync(rootEnv)) loadEnv({ path: rootEnv });
if (fs.existsSync(localEnv)) loadEnv({ path: localEnv, override: true });
import cors from 'cors';
import helmet from 'helmet';
import { authRouter, verifyJwt } from './auth';
import { circlesRouter } from './routes/circles';
import { tasksRouter } from './routes/tasks';
import { concernsRouter } from './routes/concerns';
import { schedulesRouter } from './routes/schedules';
import { chatRouter } from './routes/chat';
import { publicRouter } from './routes/public';
import { inviteAcceptRouter } from './routes/inviteAccept';
import { tendRouter } from './routes/tend';
import { aiSuggestionsRouter } from './routes/aiSuggestions';
import { voiceRouter } from './routes/voice';
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
app.use('/public', publicRouter);
app.use('/auth', authRouter);
app.use('/circles', verifyJwt, circlesRouter);
app.use('/tasks', verifyJwt, tasksRouter);
app.use('/concerns', verifyJwt, concernsRouter);
app.use('/schedules', verifyJwt, schedulesRouter);
app.use('/chat', verifyJwt, chatRouter);
app.use('/invites', verifyJwt, inviteAcceptRouter);
app.use('/ai/tend', verifyJwt, tendRouter);
app.use('/ai/suggestions', verifyJwt, aiSuggestionsRouter);
app.use('/ai/voice', verifyJwt, voiceRouter);

// ── Error handler (must be last) ──────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});

export default app;
