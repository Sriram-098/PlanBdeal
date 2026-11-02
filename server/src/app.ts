import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import v1Router from './routes/v1';
import { csrfProtection } from './middleware/csrf';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import { env } from './lib/env';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(csrfProtection);

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/v1', v1Router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
