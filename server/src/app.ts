import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { pinoHttp } from 'pino-http';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { corsOptions, helmetOptions } from './config/security.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { apiLimiter } from './middleware/rateLimit.middleware.js';
import { maintenanceMode } from './middleware/maintenanceMode.middleware.js';
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';
import { sendSuccess } from './utils/response.js';

import setupRoutes from './routes/setup.routes.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import challengeRoutes from './routes/challenge.routes.js';
import challengeInstanceRoutes from './routes/challengeInstance.routes.js';
import submissionRoutes from './routes/submission.routes.js';
import teamRoutes from './routes/team.routes.js';
import publicRoutes from './routes/public.routes.js';
import adminAuthRoutes from './routes/adminAuth.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';
import writeupRoutes from './routes/writeup.routes.js';
import reportRoutes from './routes/report.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { VERSION } from './version.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet(helmetOptions));
  app.use(cors(corsOptions));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(
    pinoHttp({
      logger,
      genReqId: (req: IncomingMessage, res: ServerResponse) => {
        const id = (req.headers['x-request-id'] as string) || randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      customLogLevel: (_req: IncomingMessage, res: ServerResponse, err?: Error) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      // Passwords/flags/tokens are redacted centrally in the logger config.
      serializers: {
        req: (req) => ({ method: req.method, url: req.url, id: req.id }),
      },
    }),
  );

  app.use('/api', apiLimiter);

  // Liveness: the process is up and can respond — no dependency checks.
  // Used by an orchestrator to decide whether to restart the container.
  app.get('/api/health/live', (_req, res) => {
    sendSuccess(res, { status: 'alive', version: VERSION });
  });

  // Readiness: the process can actually serve traffic — checks the one
  // required dependency (MongoDB). Used by an orchestrator to decide
  // whether to route traffic to this instance.
  app.get('/api/health/ready', (_req, res) => {
    const dbConnected = mongoose.connection.readyState === 1;
    sendSuccess(res, {
      status: dbConnected ? 'ready' : 'not_ready',
      version: VERSION,
      database: dbConnected ? 'connected' : 'disconnected',
    });
  });

  // Kept as an alias of /ready for backward compatibility with existing
  // tooling/tests that only know about the original combined endpoint.
  app.get('/api/health', (_req, res) => {
    const dbConnected = mongoose.connection.readyState === 1;
    sendSuccess(res, {
      status: 'healthy',
      version: VERSION,
      database: dbConnected ? 'connected' : 'disconnected',
    });
  });

  app.use(maintenanceMode);

  app.use('/api/v1/setup', setupRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/challenges', challengeRoutes);
  app.use('/api/v1/challenges', submissionRoutes);
  app.use('/api/v1/challenge-instances', challengeInstanceRoutes);
  app.use('/api/v1/teams', teamRoutes);
  app.use('/api/v1/public', publicRoutes);
  app.use('/api/v1/leaderboard', leaderboardRoutes);
  app.use('/api/v1/writeups', writeupRoutes);
  app.use('/api/v1/reports', reportRoutes);
  // Path is configurable (ADMIN_ROUTE_PREFIX, defaults to 'admin') —
  // see config/env.ts for why. adminAuthRoutes (just /login, no auth
  // required) is mounted first so it's handled before adminRoutes' blanket
  // requireAuth; everything else under this prefix falls through to
  // adminRoutes, whose real gate is requireRole('ADMIN').
  app.use(`/api/v1/${env.ADMIN_ROUTE_PREFIX}`, adminAuthRoutes);
  app.use(`/api/v1/${env.ADMIN_ROUTE_PREFIX}`, adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
