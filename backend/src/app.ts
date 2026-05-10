import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { corsOrigins } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import cellarRoutes from './routes/cellar.routes.js';
import cellarsRoutes from './routes/cellars.routes.js';
import syncRoutes from './routes/sync.routes.js';
import wineRoutes from './routes/wine.routes.js';
import notificationRoutes from './routes/notifications.routes.js';
import deliveryRoutes from './routes/deliveries.routes.js';
import reportRoutes from './routes/reports.routes.js';
import { errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('tiny'));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'wine-cellar-api', authMode: 'stateless-refresh-v2' }));
  app.use('/auth', authRoutes);
  app.use('/cellars', cellarsRoutes);
  app.use('/cellar', cellarRoutes);
  app.use('/sync', syncRoutes);
  app.use('/wines', wineRoutes);
  app.use('/deliveries', deliveryRoutes);
  app.use('/notifications', notificationRoutes);
  app.use('/reports', reportRoutes);
  app.use(errorHandler);
  return app;
}
